import { Middleware } from "../Middleware";
import { QueueItem } from "../Queue";
declare class RetryMiddleware extends Middleware {
    numTimes: number;
    retryStatusCodes: number[];
    attempts: {
        [url: string]: number;
    };
    constructor(numTimes?: number, retryStatusCodes?: number[]);
    processResponse(item: QueueItem): boolean;
}
export { RetryMiddleware };
