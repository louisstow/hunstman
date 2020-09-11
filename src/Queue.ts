import { Request, RequestState } from "./Request";
import { Response } from "./Response";

class QueueItem {
  request: Request;
  index: number;
  ready: boolean;

  constructor(request: Request, index: number) {
    this.request = request;
    this.index = index;
    this.ready = true;
  }
}

class Queue {
  queue: Array<QueueItem>;

  constructor(queue?: Array<Request>) {
    this.queue = [];
    if (queue) {
      queue.forEach((r) => this.enqueue(r));
    }
  }

  enqueue(req: Request) {
    const index = this.queue.length;
    const item = new QueueItem(req, index);
    this.queue.push(item);
  }

  dequeue(): QueueItem | null {
    const item = this.queue.find((item) => item.ready);
    if (!item) {
      return null;
    }

    item.ready = false;
    return item;
  }

  buffer(n: number) {
    const b: QueueItem[] = [];

    while (n--) {
      const item = this.dequeue();
      if (!item) {
        break;
      }

      b.push(item);
    }

    return b;
  }

  purge() {
    this.queue = this.queue.filter((item) => item.ready);
  }

  size(): number {
    return this.queue.length;
  }

  free(): number {
    return this.queue.filter((item) => item.ready).length;
  }

  forEach(fn: (value: QueueItem, index: number) => void) {
    this.queue.forEach(fn);
  }

  done(): number {
    return this.queue.filter(
      (item) =>
        item.request.state !== RequestState.REQUESTING &&
        item.request.state !== RequestState.WAITING
    ).length;
  }

  serialize(): object[] {
    return this.queue.map((item) => ({
      index: item.index,
      request: item.request.serialize(),
    }));
  }

  static deserialize(obj: object[]) {
    const items = obj
      .map((o: any) => {
        let req, resp;

        if (o.request) {
          req = new Request(o.request.url, o.request.method, o.request.data);
          if (o.request.headers) {
            req.headers = o.request.headers;
          }

          if (o.request.meta) {
            req.meta = o.request.meta;
          }

          if (o.request.response) {
            const respData = o.request.response;
            resp = new Response(
              req,
              respData.status,
              respData.statusText,
              respData.headers,
              null,
              respData.raw
            );

            req.response = resp;
          }

          return new QueueItem(req, o.index);
        }

        return null;
      })
      .filter((item) => item !== null) as QueueItem[];

    const q = new Queue();
    q.queue = items;
    return q;
  }

  static empty() {
    return new Queue([]);
  }
}

export { Queue, QueueItem };
