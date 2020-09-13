import { Queue, QueueItem, QueueItemState } from "./Queue";
import { Request, RequestState } from "./Request";
import { Settings } from "./Settings";
import type { Response } from "./Response";
import { Middleware } from "./Middleware";
import { EventEmitter } from "events";
import { Log, Logger } from "./Log";
import { AxiosError } from "__mocks__/axios";

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
type Resolver = (value: Response[]) => void;

class Spider extends EventEmitter {
  name: string;
  queue: Queue;
  state: SpiderState;
  middleware: Array<Middleware>;
  settings: Settings;
  logger: Log;
  results: Array<Response>;

  doneResolver: Resolver;

  constructor(
    name: string,
    queue?: Requestable,
    settings?: Settings,
    logger?: Logger
  ) {
    super();

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
    this.doneResolver = () => {};

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

  pause() {
    this.state = SpiderState.PAUSED;
  }

  resume() {
    this.state = SpiderState.CRAWLING;
    this.startCrawl(this.doneResolver);
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
    this.doneResolver = () => {};
  }

  purge() {
    this.queue.forEach((item) => {
      if (item.state === QueueItemState.FINISHED) {
        delete this.results[item.index];
      }
    });

    this.queue.clearFinished();
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

    this.doneResolver(this.results);
  }

  private checkSpiderFinished() {
    const remaining = this.queue.countRemainingItems();

    if (remaining === 0) {
      this.handleSpiderFinished();
    }
  }

  private runNextItem() {
    if (
      this.state === SpiderState.CANCELLED ||
      this.state === SpiderState.PAUSED
    ) {
      return;
    }

    const nextItem = this.queue.reserveFirstReadyItem();
    if (nextItem) {
      this.runQueueItem(nextItem);
    } else {
      this.checkSpiderFinished();
    }
  }

  private async runRequestMiddleware(item: QueueItem) {
    let r: Request | null = item.request;
    for (let i = 0; i < this.middleware.length; ++i) {
      r = await this.middleware[i].processRequest(r, this);

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

  private async runQueueItem(item: QueueItem) {
    const req = await this.runRequestMiddleware(item);

    if (req === null) {
      this.skipQueueItem(item);
      return;
    }

    try {
      const resp = await req.run();
      item.state = QueueItemState.FINISHED;

      // do not trigger or continue processing if
      // the spider is cancelled
      if (this.state === SpiderState.CANCELLED) {
        return;
      }

      const passes = await this.runResponseMiddleware(item);

      if (passes && resp) {
        this.results[item.index] = resp;
        this.emit(SpiderEvents.RESPONSE, resp, item);
      }
    } catch (err) {
      if (item.request.response) {
        this.results[item.index] = item.request.response;
      }

      item.state = QueueItemState.FINISHED;
      await this.runResponseMiddleware(item);
      this.emit(SpiderEvents.ERROR, err, item);
    }

    this.emit(SpiderEvents.REQUEST_DONE, item);
    this.runNextItem();
  }

  private startCrawl(resolve: Resolver) {
    this.doneResolver = resolve;

    const buffer = this.queue.buffer(
      this.settings.get("maxRequests", DEFAULT_MAX_REQUESTS)
    );

    if (buffer.length === 0) {
      this.handleSpiderFinished();
      return;
    }

    buffer.forEach((item) => this.runQueueItem(item));
  }

  run(queue?: Requestable): Promise<Response[]> {
    if (this.state === SpiderState.CRAWLING) {
      throw new Error("Spider is already running");
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

    return new Promise<Response[]>(this.startCrawl.bind(this));
  }
}

export { Spider, SpiderEvents, SpiderState };
