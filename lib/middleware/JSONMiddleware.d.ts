import { Middleware } from "../Middleware";
import { QueueItem } from "../Queue";
declare class JSONMiddleware extends Middleware {
    requireContentType: boolean;
    constructor(requireContentType?: boolean);
    processResponse(item: QueueItem): Promise<boolean>;
}
export { JSONMiddleware };
