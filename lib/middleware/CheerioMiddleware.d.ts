import { Middleware } from "../Middleware";
import { QueueItem } from "../Queue";
declare class CheerioMiddleware extends Middleware {
    isXML: boolean;
    constructor(options?: {
        isXML: boolean;
    });
    processResponse(item: QueueItem): Promise<boolean>;
}
export { CheerioMiddleware };
