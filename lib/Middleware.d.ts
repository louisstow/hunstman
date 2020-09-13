import type { Request } from "./Request";
import { QueueItem } from "./Queue";
import { Spider } from "./Spider";
declare class Middleware {
    processRequest(r: Request | null, spider: Spider): Promise<Request | null>;
    processResponse(item: QueueItem, spider: Spider): Promise<boolean>;
}
export { Middleware };
