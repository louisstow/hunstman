import { Middleware } from "../Middleware";
import { QueueItem } from "Queue";
declare class CheerioMiddleware extends Middleware {
    processResponse(item: QueueItem): boolean;
}
export { CheerioMiddleware };
