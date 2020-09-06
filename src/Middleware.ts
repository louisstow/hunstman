import type { Request } from "./Request";
import { QueueItem } from "./Queue";
import { Spider } from "./Spider";

class Middleware {
  processRequest(r: Request | null, spider: Spider): Promise<Request | null> {
    return Promise.resolve<Request | null>(r);
  }
  processResponse(item: QueueItem, spider: Spider): boolean {
    return true;
  }
}

export { Middleware };
