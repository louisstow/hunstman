import { Queue, QueueItem, QueueItemState } from "./Queue";
import { Request, RequestState } from "./Request";
import { Setting, Settings } from "./Settings";
import type { Response } from "./Response";
import { Middleware } from "./Middleware";
import { CrawlError, HandlerError, ResponseError } from "./Error";
import { ConsoleLogger, Logger } from "./Log";
import { Engine } from "./Engine";

enum SpiderEvents {
  DONE = "done",
  SKIP = "skip",
  RESPONSE = "response",
  ERROR = "fail",
  REQUEST_DONE = "requestDone",
}

const DEFAULT_TIMEOUT = 10000;

type Requestable = Queue | Request | Array<Request>;
type CallbackFunction = (...args: any[]) => Promise<void>;

class Spider {
  name: string;
  queue: Queue;
  engine: Engine;
  middleware: Array<Middleware>;
  settings: Settings;
  logger: Logger;
  results: Array<Response>;
  handlers: { [k: string]: CallbackFunction[] };
  handlerErrors: HandlerError[] = [];
  history: string[];

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
    this.settings = settings || new Settings();

    this.logger =
      logger ||
      this.settings.get<Logger>("logger", undefined) ||
      new ConsoleLogger(`[${this.name}]`);

    this.engine = new Engine({
      queue: this.queue,
      settings: this.settings,
      handleItem: async (item, bufferIndex) => {
        await this.runQueueItem(item, bufferIndex);
      },
    });

    if (queue) {
      this.setQueue(queue);
    }

    this.middleware = [];
    this.results = [];
    this.handlers = {};
    this.history = [];

    this.stats = {
      numSuccessfulRequests: 0,
      numFailedRequests: 0,
      numRequests: 0,
      lastRequestTime: 0,
      startSpiderTime: 0,
      endSpiderTime: 0,
    };

    // global middleware from settings
    if (this.settings.get(Setting.MIDDLEWARE, false)) {
      const middleware = this.settings.get<Middleware[]>(
        Setting.MIDDLEWARE,
        []
      );
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

    this.engine.setQueue(this.queue);
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
    this.engine.pause();
  }

  resume() {
    this.engine.resume();
  }

  cancel() {
    this.queue.forEach((item) => {
      item.setFinished();
      item.request.cancel();
      item.request.reset();
    });

    this.engine.cancel();
  }

  reset() {
    this.queue.forEach((item) => {
      item.setReady();
      item.request.reset();
    });

    this.results = [];
    this.history.length = 0;
    this.handlerErrors.length = 0;
    this.engine.reset();
  }

  purge() {
    this.queue.forEach((item) => {
      if (item.state === QueueItemState.FINISHED) {
        if (item.request.response) item.request.response.data = null;
        delete this.results[item.index];
      }
    });
  }

  pushHistory(msg: string) {
    this.history.push(`[${Date.now()}] ${msg}`);
  }

  async executeResponseHandler(
    fn: CallbackFunction,
    response: Response,
    item: QueueItem
  ) {
    try {
      await fn(response, item);
    } catch (err) {
      const respErr = ResponseError.create(
        err,
        response.request.url,
        response.status
      );

      await this.emit(SpiderEvents.ERROR, respErr);
      response.request.emit(SpiderEvents.ERROR, respErr);
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
    try {
      await Promise.all(fns.map((f) => f(...args)));
    } catch (err) {
      this.handlerErrors.push(HandlerError.create(err, event));
    }
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
    const proxy = this.settings.get<string | null>(Setting.PROXY, null);
    const timeout = this.settings.get<number>(Setting.TIMEOUT, DEFAULT_TIMEOUT);

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

  private async handleSpiderFinished() {
    await this.emit(SpiderEvents.DONE, this.results);
  }

  private async runRequestMiddleware(item: QueueItem, bufferIndex: number) {
    let r: Request | null = item.request;
    for (let i = 0; i < this.middleware.length; ++i) {
      r = await this.middleware[i].processRequest(r, this, bufferIndex);

      // exit immediately on null
      if (r === null) {
        this.pushHistory(`${item.index} failed request middleware`);
        return null;
      }
    }

    this.pushHistory(`${item.index} passed request middleware`);
    return r;
  }

  private async runResponseMiddleware(item: QueueItem) {
    for (let i = 0; i < this.middleware.length; ++i) {
      const passes = await this.middleware[i].processResponse(item, this);
      if (!passes) {
        this.pushHistory(`${item.index} failed response middleware`);
        return false;
      }
    }

    this.pushHistory(`${item.index} passed response middleware`);
    return true;
  }

  private async runQueueItem(item: QueueItem, bufferIndex: number) {
    const req = await this.runRequestMiddleware(item, bufferIndex);
    let resp: Response | null = null;
    let passes = false;

    if (req === null) {
      this.skipQueueItem(item);
      return;
    }

    try {
      this.pushHistory(`${item.index} start request`);
      resp = await req.run();
      item.setFinished();
      this.pushHistory(`${item.index} finished request`);

      // do not trigger or continue processing if
      // the spider is cancelled
      if (this.engine.isCancelled()) {
        return;
      }

      passes = await this.runResponseMiddleware(item);
    } catch (err) {
      item.setFinished();
      if (this.engine.isCancelled()) {
        return;
      }

      this.pushHistory(`${item.index} failed request`);

      if (item.request.response) {
        this.results[item.index] = item.request.response;
      }

      await this.runResponseMiddleware(item);

      const crawlErr = CrawlError.create(err, req);
      await this.emit(SpiderEvents.ERROR, crawlErr);
      req.emit(SpiderEvents.ERROR, crawlErr);
      this.stats.numFailedRequests++;
    }

    if (passes && resp) {
      this.results[item.index] = resp;
      this.stats.numSuccessfulRequests++;

      await this.emitResponse(resp, item);
    }

    this.emit(SpiderEvents.REQUEST_DONE, item);
    req.emit(SpiderEvents.REQUEST_DONE, item);
    this.stats.lastRequestTime = Date.now();
    this.stats.numRequests++;
  }

  async run(queue?: Requestable): Promise<Response[]> {
    if (this.engine.isRunning()) {
      const debugState = `${this.queue.getDebugState()}\nHistory: ${this.history.join(
        "\n"
      )}}`;
      throw new Error(`${this.name} is already running:\n${debugState}`);
    }

    this.reset();

    // if a requestable is passed in, override our queue
    if (queue) {
      this.setQueue(queue);
    }

    if (!this.queue.size()) {
      throw new Error("Queue is empty");
    }

    this.applySettingsToQueueRequests();

    this.stats.startSpiderTime = Date.now();

    await this.engine.run();
    await this.handleSpiderFinished();

    this.stats.endSpiderTime = Date.now();

    return this.results;
  }
}

export { Spider, SpiderEvents };
