import type { Request } from "./Request";
import { QueueItem } from "./Queue";
import { Spider } from "./Spider";

class Middleware {
  processRequest(
    r: Request | null,
    spider: Spider,
    bufferIndex: number
  ): Promise<Request | null> {
    return Promise.resolve<Request | null>(r);
  }
  processResponse(item: QueueItem, spider: Spider): Promise<boolean> {
    return Promise.resolve(true);
  }
}

export { Middleware };
