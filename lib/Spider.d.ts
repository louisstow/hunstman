/// <reference types="node" />
import { Queue, QueueItem } from "./Queue";
import { Request } from "./Request";
import { Settings } from "./Settings";
import type { Response } from "./Response";
import { Middleware } from "./Middleware";
import { EventEmitter } from "events";
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
declare type Resolver = (value: Response[]) => void;
declare class Spider extends EventEmitter {
    name: string;
    queue: Queue;
    state: SpiderState;
    middleware: Array<Middleware>;
    settings: Settings;
    logger: Log;
    results: Array<Response>;
    resolver: Resolver | null;
    constructor(name: string, queue?: Requestable, settings?: Settings, logger?: Logger);
    addMiddleware(middleware: Middleware): void;
    pause(): void;
    resume(): void;
    cancel(): void;
    reset(): void;
    stats(): void;
    _onDone(resolve: Resolver): void;
    _processItem(resolve: Resolver, item: QueueItem): void;
    run(queue?: Requestable): Promise<Response[]>;
}
export { Spider, SpiderEvents, SpiderState };
