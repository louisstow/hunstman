import { Queue, QueueItem } from "./Queue";
import { Request } from "./Request";
import { Settings } from "./Settings";
import type { Response } from "./Response";
import { Middleware } from "./Middleware";
import { HandlerError } from "./Error";
import { Logger } from "./Log";
import { Engine } from "./Engine";
declare enum SpiderEvents {
    DONE = "done",
    SKIP = "skip",
    RESPONSE = "response",
    ERROR = "fail",
    REQUEST_DONE = "requestDone"
}
type Requestable = Queue | Request | Array<Request>;
type CallbackFunction = (...args: any[]) => Promise<void>;
declare class Spider {
    name: string;
    queue: Queue;
    engine: Engine;
    middleware: Array<Middleware>;
    settings: Settings;
    logger: Logger;
    results: Array<Response>;
    handlers: {
        [k: string]: CallbackFunction[];
    };
    handlerErrors: HandlerError[];
    history: string[];
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
    removeMiddleware(index: number): void;
    replaceMiddleware(index: number, middleware: Middleware): void;
    pause(): void;
    resume(): void;
    cancel(): void;
    reset(): void;
    purge(): void;
    pushHistory(msg: string): void;
    executeResponseHandler(fn: CallbackFunction, response: Response, item: QueueItem): Promise<void>;
    emitResponse(response: Response, item: QueueItem): Promise<void>;
    emit(event: SpiderEvents, ...args: any): Promise<void>;
    on(event: SpiderEvents, cb: CallbackFunction): void;
    off(event: SpiderEvents, cb: CallbackFunction): void;
    once(event: SpiderEvents, cb: CallbackFunction): void;
    private applySettingsToQueueRequests;
    private skipQueueItem;
    private handleSpiderFinished;
    private runRequestMiddleware;
    private runResponseMiddleware;
    private runQueueItem;
    run(queue?: Requestable): Promise<Response[]>;
    static _defaultMiddleware: Middleware[];
    static setDefaultMiddleware(middleware: Middleware[]): void;
    static clearDefaultMiddleware(): void;
}
export { Spider, SpiderEvents };
