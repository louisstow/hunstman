import { Queue, QueueItem } from "./Queue";
import { Request } from "./Request";
import { Settings } from "./Settings";
import type { Response } from "./Response";
import { Middleware } from "./Middleware";
import { Log, Logger } from "./Log";
declare enum SpiderState {
    IDLE = 0,
    CRAWLING = 1,
    CANCELLED = 2,
    PAUSED = 3,
    DONE = 4
}
declare enum SpiderEvents {
    DONE = "done",
    SKIP = "skip",
    RESPONSE = "response",
    ERROR = "fail",
    REQUEST_DONE = "requestDone"
}
declare type Requestable = Queue | Request | Array<Request>;
declare type CallbackFunction = (...args: any[]) => Promise<void>;
declare class Spider {
    name: string;
    queue: Queue;
    state: SpiderState;
    middleware: Array<Middleware>;
    settings: Settings;
    logger: Log;
    results: Array<Response>;
    handlers: {
        [k: string]: CallbackFunction[];
    };
    handlerPromises: Array<Promise<void>>;
    stats: {
        numSuccessfulRequests: number;
        numFailedRequests: number;
        numRequests: number;
        lastRequestTime: number;
        startSpiderTime: number;
        endSpiderTime: number;
    };
    constructor(name: string, queue?: Requestable, settings?: Settings, logger?: Logger);
    setQueue(queue: Requestable): void;
    addMiddleware(middleware: Middleware): void;
    pause(): void;
    resume(): Promise<void>;
    cancel(): void;
    reset(): void;
    purge(): void;
    executeResponseHandler(f: CallbackFunction, response: Response, item: QueueItem): Promise<void>;
    emitResponse(response: Response, item: QueueItem): void;
    emit(event: SpiderEvents, ...args: any): void;
    on(event: SpiderEvents, cb: CallbackFunction): void;
    off(event: SpiderEvents, cb: CallbackFunction): void;
    once(event: SpiderEvents, cb: CallbackFunction): void;
    private applySettingsToQueueRequests;
    private skipQueueItem;
    private handleSpiderFinished;
    private checkSpiderFinished;
    private crawlNextItems;
    private runRequestMiddleware;
    private runResponseMiddleware;
    private runQueueItem;
    run(queue?: Requestable): Promise<Response[]>;
}
export { Spider, SpiderEvents, SpiderState };
