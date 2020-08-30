import { Queue, QueueItem } from "./Queue";
import { Request, RequestState } from "./Request";
import { Settings } from "./Settings";
import type { Response } from "./Response";
import { Middleware } from "./Middleware";
import { EventEmitter } from "events";
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
type Resolver = (value: Response[]) => void;

class Spider extends EventEmitter {
  name: string;
  queue: Queue;
  state: SpiderState;
  middleware: Array<Middleware>;
  settings: Settings;
  logger: Log;
  results: Array<Response>;
  resolver: Resolver | null;

  constructor(
    name: string,
    queue?: Requestable,
    settings?: Settings,
    logger?: Logger
  ) {
    super();

    this.name = name;

    if (queue instanceof Request) {
      this.queue = new Queue([queue]);
    } else if (Array.isArray(queue)) {
      this.queue = new Queue(queue);
    } else if (queue instanceof Queue) {
      this.queue = queue;
    } else {
      this.queue = Queue.empty();
    }

    this.settings = settings || new Settings();
    this.logger = new Log(`[${this.name}]`, logger);

    this.state = SpiderState.IDLE;
    this.middleware = [];
    this.results = [];
    this.resolver = null;

    // global middleware from settings
    if (this.settings.get("middleware", false)) {
      const middleware = this.settings.get("middleware", []) as Middleware[];
      middleware.forEach((m) => this.addMiddleware(m));
    }
  }

  addMiddleware(middleware: Middleware) {
    this.middleware.push(middleware);
  }

  pause() {
    this.state = SpiderState.PAUSED;
  }

  resume() {
    if (!this.resolver) {
      throw new Error("Missing resolver to resume");
    }

    this.state = SpiderState.CRAWLING;

    const buffer = this.queue.buffer(
      this.settings.get("maxRequests", DEFAULT_MAX_REQUESTS)
    );
    if (!buffer.length) {
      this._onDone(this.resolver);
    }

    buffer.forEach(
      (item) => this.resolver && this._processItem(this.resolver, item)
    );
  }

  cancel() {
    this.state = SpiderState.CANCELLED;

    this.queue.queue.forEach((item) => {
      if (item.request.state === RequestState.REQUESTING) {
        item.free = true;
      }

      item.request.cancel();
    });
  }

  reset() {
    this.state = SpiderState.IDLE;
    this.resolver = null;

    this.queue.queue.forEach((item) => {
      item.free = true;
    });
  }

  stats() {}

  _onDone(resolve: Resolver) {
    resolve(this.results);
    this.state = SpiderState.DONE;
    this.resolver = null;
    this.emit(SpiderEvents.DONE, this.results);
  }

  _processItem(resolve: Resolver, item: QueueItem) {
    let p = Promise.resolve<Request | null>(item.request);

    this.middleware.forEach((m) => {
      p = p
        .then((r) => m.processRequest(r))
        .catch(() => {
          return null;
        });
    });

    p.then((r) => {
      if (r === null) {
        this.emit(SpiderEvents.SKIP, item);
        item.request.state = RequestState.SKIPPED;
        return false;
      }

      r.run()
        .then((out) => {
          // run middleware on response / error
          return this.middleware.every((m, n) => m.processResponse(item, this));
        })
        .then((passes) => {
          if (passes && item.request.response) {
            this.results[item.index] = item.request.response;
            this.emit(SpiderEvents.RESPONSE, this.results[item.index], item);
          }
          return passes;
        })
        .catch((err) => {
          if (item.request.response) {
            this.results[item.index] = item.request.response;
          }
          this.emit(SpiderEvents.ERROR, err, item);
        })
        .then(() => {
          this.emit(SpiderEvents.REQUEST_DONE, item);

          if (
            this.state === SpiderState.CANCELLED ||
            this.state === SpiderState.PAUSED
          ) {
            return;
          }

          const nextItem = this.queue.dequeue();

          if (nextItem) {
            this._processItem(resolve, nextItem);
          } else {
            const done = this.queue.done();
            const free = this.queue.free();
            const size = this.queue.size();

            if (done === size && free === 0) {
              this._onDone(resolve);
            }
          }
        });
    });
  }

  run(queue?: Requestable): Promise<Response[]> {
    if (this.state === SpiderState.CRAWLING) {
      throw new Error("Spider is already running");
    }

    // if a requestable is passed in, override our queue
    if (queue) {
      if (queue instanceof Queue) {
        this.queue = queue;
      } else if (queue instanceof Request) {
        this.queue = new Queue([queue]);
      } else {
        this.queue = new Queue(queue);
      }
    }

    if (!this.queue.size()) {
      throw new Error("Queue is empty");
    }

    // initialize the proxy settings on the requests
    if (this.settings.get("proxy", false)) {
      const proxy = this.settings.get("proxy") as string;
      const timeout = this.settings.get("timeout", DEFAULT_TIMEOUT) as number;

      this.queue.queue.forEach((item) => {
        item.request.setProxy(proxy);
        item.request.setTimeout(timeout);
      });
    }

    this.state = SpiderState.CRAWLING;

    const promise = new Promise<Response[]>((resolve) => {
      this.resolver = resolve;
      const buffer = this.queue.buffer(
        this.settings.get("maxRequests", DEFAULT_MAX_REQUESTS)
      );

      if (!buffer.length) {
        this._onDone(resolve);
      }

      buffer.forEach((item) => this._processItem(resolve, item));
    });

    return promise;
  }
}

export { Spider, SpiderEvents, SpiderState };
