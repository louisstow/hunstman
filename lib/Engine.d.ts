import { Settings } from "./Settings";
import { Queue, QueueItem } from "./Queue";
export declare enum EngineState {
    WAITING = 0,
    RUNNING = 1,
    PAUSED = 2,
    CANCELLED = 3
}
export type Handler = (item: QueueItem, localIndex: number) => Promise<void>;
export declare const DEFAULT_MAX_REQUESTS = 50;
declare class Engine {
    queue: Queue;
    state: EngineState;
    handleItem: Handler;
    maxConcurrentRequests: number;
    pausePromise?: Promise<void>;
    pauseResolver?: () => void;
    constructor({ queue, settings, handleItem, }: {
        queue: Queue;
        settings: Settings;
        handleItem: Handler;
    });
    reset(): void;
    pause(): boolean;
    resume(): boolean;
    cancel(): boolean;
    isRunning(): boolean;
    isWaiting(): boolean;
    isPaused(): boolean;
    isCancelled(): boolean;
    setQueue(queue: Queue): void;
    run(): Promise<void>;
    executeFromItem(item: QueueItem, localIndex: number): Promise<void>;
    execute(): Promise<void>;
}
export { Engine };
