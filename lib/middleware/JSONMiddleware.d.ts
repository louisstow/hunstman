import { Middleware } from "../Middleware";
import { QueueItem } from "Queue";
declare class JSONMiddleware extends Middleware {
    processResponse(item: QueueItem): boolean;
}
export { JSONMiddleware };
