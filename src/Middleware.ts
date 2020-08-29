import type { Request } from "./Request";
import { QueueItem } from "./Queue";
import { Spider } from "./Spider";

class Middleware {
  processRequest(r: Request | null): Promise<Request | null> {
    return Promise.resolve<Request | null>(r);
  }
  processResponse(item: QueueItem, spider: Spider): boolean {
    return true;
  }
}

const dedupe = {};

class DelayMiddleware extends Middleware {
  processRequest(r: Request): Promise<Request> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(r), 100);
    });
  }
}

class DedupeMiddleware extends Middleware {
  dedupe: { [k: string]: boolean };

  constructor() {
    super();
    this.dedupe = {};
  }

  processRequest(r: Request): Promise<Request> {
    if (this.dedupe[r.url]) {
      return Promise.reject();
    }

    this.dedupe[r.url] = true;
    return Promise.resolve(r);
  }
}

class RetryMiddleware extends Middleware {
  processResponse(item: QueueItem): boolean {
    // probably shouldnt be non-200
    if (item.request.response && item.request.response.status !== 200) {
      item.free = true;
    }

    return false;
  }
}

class JSONMiddleware extends Middleware {
  processResponse(item: QueueItem): boolean {
    // probably shouldnt be non-200
    if (item.request.response && item.request.response.status === 200) {
      item.request.response.data = JSON.parse(item.request.response.data);
    }

    return true;
  }
}

export { Middleware };
