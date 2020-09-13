import { Middleware } from "../Middleware";
import { Request } from "../Request";
import { QueueItem } from "../Queue";
import { Spider } from "../Spider";
declare class DebugMiddleware extends Middleware {
    processRequest(r: Request, spider: Spider): Promise<Request>;
    processResponse(item: QueueItem, spider: Spider): Promise<boolean>;
}
export { DebugMiddleware };
