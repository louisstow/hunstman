import type { Request } from "./Request";
import { QueueItem } from "./Queue";
import { Spider } from "./Spider";
declare class Middleware {
    processRequest(r: Request | null): Promise<Request | null>;
    processResponse(item: QueueItem, spider: Spider): boolean;
}
export { Middleware };
