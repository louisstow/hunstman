import { Queue, QueueItem, QueueItemState } from "./Queue";
import { Request, RequestState } from "./Request";
import { Settings } from "./Settings";
import type { Response } from "./Response";
import { Middleware } from "./Middleware";
import { ResponseError } from "./Error";
import { Log, Logger } from "./Log";

enum SpiderState {
  IDLE,
  CRAWLING,
  CANCELLED,
  PAUSED,
  DONE,
}

enum SpiderEvents {
  DONE = "done",
  SKIP = "skip",
  RESPONSE = "response",
  ERROR = "fail",
  REQUEST_DONE = "requestDone",
}

const DEFAULT_MAX_REQUESTS = 50;
const DEFAULT_TIMEOUT = 10000;

type Requestable = Queue | Request | Array<Request>;
type CallbackFunction = (...args: any[]) => Promise<void>;

class Spider {
  name: string;
  queue: Queue;
  state: SpiderState;
  middleware: Array<Middleware>;
  settings: Settings;
  logger: Log;
  results: Array<Response>;
  handlers: { [k: string]: CallbackFunction[] };
  handlerPromises: Array<Promise<void>>;
  doneResolver: () => void;

  stats: {
    numSuccessfulRequests: number;
    numFailedRequests: number;
    numRequests: number;
    lastRequestTime: number;
    startSpiderTime: number;
    endSpiderTime: number;
  };

  constructor(
    name: string,
    queue?: Requestable,
    settings?: Settings,
    logger?: Logger
  ) {
    this.name = name;
    this.queue = Queue.empty();

    if (queue) {
      this.setQueue(queue);
    }

    this.settings = settings || new Settings();
    this.logger = new Log(`[${this.name}]`, logger);

    this.state = SpiderState.IDLE;
    this.middleware = [];
    this.results = [];
    this.handlers = {};
    this.handlerPromises = [];
    this.doneResolver = () => {};

    this.stats = {
      numSuccessfulRequests: 0,
      numFailedRequests: 0,
      numRequests: 0,
      lastRequestTime: 0,
      startSpiderTime: 0,
      endSpiderTime: 0,
    };

    // global middleware from settings
    if (this.settings.get("middleware", false)) {
      const middleware = this.settings.get("middleware", []) as Middleware[];
      middleware.forEach((m) => this.addMiddleware(m));
    }
  }

  setQueue(queue: Requestable) {
    if (queue instanceof Request) {
      this.queue = new Queue([queue]);
    } else if (Array.isArray(queue)) {
      this.queue = new Queue(queue);
    } else if (queue instanceof Queue) {
      this.queue = queue;
    }
  }

  addMiddleware(middleware: Middleware) {
    this.middleware.push(middleware);
  }

  removeMiddleware(index: number) {
    this.middleware.splice(index, 1);
  }

  replaceMiddleware(index: number, middleware: Middleware) {
    this.middleware[index] = middleware;
  }

  pause() {
    this.state = SpiderState.PAUSED;
  }

  async resume() {
    this.state = SpiderState.CRAWLING;
    await this.crawlNextItems();
  }

  cancel() {
    this.state = SpiderState.CANCELLED;

    this.queue.forEach((item) => {
      if (item.request.state === RequestState.REQUESTING) {
        item.state = QueueItemState.FINISHED;
      }

      item.request.cancel();
      item.request.reset();
    });
  }

  reset() {
    this.state = SpiderState.IDLE;

    this.queue.forEach((item) => {
      item.state = QueueItemState.READY;
      item.request.reset();
    });

    this.handlerPromises.length = 0;
  }

  purge() {
    this.queue.forEach((item) => {
      if (item.state === QueueItemState.FINISHED) {
        if (item.request.response) item.request.response.data = null;
        delete this.results[item.index];
      }
    });

    this.queue.clearFinished();
  }

  async executeResponseHandler(
    f: CallbackFunction,
    response: Response,
    item: QueueItem
  ) {
    try {
      await f(response, item);
    } catch (err) {
      if (err instanceof Error) {
        throw ResponseError.fromError(
          err,
          response.request.url,
          response.status
        );
      } else {
        throw err;
      }
    }
  }

  async emitResponse(response: Response, item: QueueItem) {
    const fns = this.handlers[SpiderEvents.RESPONSE] || [];
    await Promise.all(
      fns.map((f) => this.executeResponseHandler(f, response, item))
    );
  }

  async emit(event: SpiderEvents, ...args: any) {
    if (event === SpiderEvents.RESPONSE) {
      return this.emitResponse(args[0], args[1]);
    }

    const fns = this.handlers[event] || [];
    await Promise.all(fns.map((f) => f(...args)));
  }

  on(event: SpiderEvents, cb: CallbackFunction) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }

    this.handlers[event].push(cb);
  }

  off(event: SpiderEvents, cb: CallbackFunction) {
    const fns = this.handlers[event] || [];
    const index = fns.indexOf(cb);
    if (index > -1) {
      this.handlers[event].splice(index, 1);
    }
  }

  once(event: SpiderEvents, cb: CallbackFunction) {
    this.on(event, async () => {
      this.off(event, cb);
      await cb();
    });
  }

  private applySettingsToQueueRequests() {
    const proxy = this.settings.get("proxy", null) as string | null;
    const timeout = this.settings.get("timeout", DEFAULT_TIMEOUT) as number;

    this.queue.forEach((item) => {
      if (proxy) {
        item.request.setProxy(proxy);
      }

      item.request.setTimeout(timeout);
    });
  }

  private skipQueueItem(item: QueueItem) {
    this.emit(SpiderEvents.SKIP, item);
    item.state = QueueItemState.FINISHED;
    item.request.state = RequestState.SKIPPED;
  }

  private handleSpiderFinished() {
    this.state = SpiderState.DONE;
    this.emit(SpiderEvents.DONE, this.results);

    this.doneResolver();
  }

  private checkSpiderFinished() {
    const remaining = this.queue.countRemainingItems();

    if (remaining === 0) {
      this.handleSpiderFinished();
      return true;
    }

    return false;
  }

  private async crawlNextItems() {
    if (
      this.state === SpiderState.CANCELLED ||
      this.state === SpiderState.PAUSED
    ) {
      return;
    }

    const maxRequests = this.settings.get(
      "maxRequests",
      DEFAULT_MAX_REQUESTS
    ) as number;

    const inUse = this.queue.countInUse();
    const reserve = Math.max(maxRequests - inUse, 0);

    const buffer = this.queue.buffer(reserve);

    if (buffer.length === 0) {
      this.checkSpiderFinished();
      return;
    }

    await Promise.all(buffer.map((item, i) => this.runQueueItem(item, i)));
  }

  private async runRequestMiddleware(item: QueueItem, bufferIndex: number) {
    let r: Request | null = item.request;
    for (let i = 0; i < this.middleware.length; ++i) {
      r = await this.middleware[i].processRequest(r, this, bufferIndex);

      // exit immediately on null
      if (r === null) {
        return null;
      }
    }

    return r;
  }

  private async runResponseMiddleware(item: QueueItem) {
    for (let i = 0; i < this.middleware.length; ++i) {
      const passes = await this.middleware[i].processResponse(item, this);
      if (!passes) {
        return false;
      }
    }

    return true;
  }

  private async runQueueItem(item: QueueItem, bufferIndex: number) {
    const req = await this.runRequestMiddleware(item, bufferIndex);
    let resp: Response | null = null;
    let passes = false;

    if (req === null) {
      this.skipQueueItem(item);
      await this.crawlNextItems();
      return;
    }

    try {
      resp = await req.run();
      item.state = QueueItemState.FINISHED;

      // do not trigger or continue processing if
      // the spider is cancelled
      if (this.state === SpiderState.CANCELLED) {
        return;
      }

      passes = await this.runResponseMiddleware(item);
    } catch (err) {
      item.state = QueueItemState.FINISHED;
      if (this.state === SpiderState.CANCELLED) {
        return;
      }

      if (item.request.response) {
        this.results[item.index] = item.request.response;
      }

      await this.runResponseMiddleware(item);
      await this.emit(SpiderEvents.ERROR, err, item);
      req.emit(SpiderEvents.ERROR, err, item);
      this.stats.numFailedRequests++;
    }

    if (passes && resp) {
      this.results[item.index] = resp;
      this.stats.numSuccessfulRequests++;

      try {
        await this.emitResponse(resp, item);
      } catch (err) {
        await this.emit(SpiderEvents.ERROR, err, item);
        req.emit(SpiderEvents.ERROR, err, item);
      }
    }

    this.emit(SpiderEvents.REQUEST_DONE, item);
    req.emit(SpiderEvents.REQUEST_DONE, item);
    this.stats.lastRequestTime = Date.now();
    this.stats.numRequests++;

    await this.crawlNextItems();
  }

  async run(queue?: Requestable): Promise<Response[]> {
    if (this.state === SpiderState.CRAWLING) {
      const debugState = this.queue.getDebugState();
      throw new Error(`${this.name} is already running:\n${debugState}`);
    }

    // if a requestable is passed in, override our queue
    if (queue) {
      this.setQueue(queue);
    }

    if (!this.queue.size()) {
      throw new Error("Queue is empty");
    }

    this.applySettingsToQueueRequests();

    this.state = SpiderState.CRAWLING;
    this.stats.startSpiderTime = Date.now();

    // create empty promise that will be resolved when the spider is done
    const donePromise = new Promise<void>(
      (resolve) => (this.doneResolver = resolve)
    );

    await this.crawlNextItems();

    this.stats.endSpiderTime = Date.now();

    // wait for async handlers
    await Promise.all(this.handlerPromises);
    this.handlerPromises.length = 0;

    // wait for the queue items to signal done
    await donePromise;

    return this.results;
  }
}

export { Spider, SpiderEvents, SpiderState };
