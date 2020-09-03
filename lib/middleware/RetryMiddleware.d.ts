import { Middleware } from "../Middleware";
import { QueueItem } from "../Queue";
declare class RetryMiddleware extends Middleware {
    numTimes: number;
    retryCodes: number[];
    attempts: {
        [url: string]: number;
    };
    constructor(numTimes?: number, retryCodes?: number[]);
    processResponse(item: QueueItem): boolean;
}
export { RetryMiddleware };
