import { Request, RequestState } from "./Request";

class QueueItem {
  request: Request;
  index: number;
  free: boolean;

  constructor(request: Request, index: number) {
    this.request = request;
    this.index = index;
    this.free = true;
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
    const item = this.queue.find((item) => item.free);
    if (!item) {
      return null;
    }

    item.free = false;
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

  size(): number {
    return this.queue.length;
  }

  free(): number {
    return this.queue.filter((item) => !!item.free).length;
  }

  done(): number {
    return this.queue.filter(
      (item) =>
        item.request.state !== RequestState.REQUESTING &&
        item.request.state !== RequestState.WAITING
    ).length;
  }

  static empty() {
    return new Queue([]);
  }
}

export { Queue, QueueItem };
