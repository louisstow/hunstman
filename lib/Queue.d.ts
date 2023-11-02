import { Request } from "./Request";
declare enum QueueItemState {
    READY = 0,
    IN_USE = 1,
    FINISHED = 2
}
declare class QueueItem {
    request: Request;
    index: number;
    state: QueueItemState;
    constructor(request: Request, index: number);
    setFinished(): void;
    setReady(): void;
    setInUse(): void;
}
declare class Queue {
    queue: Array<QueueItem>;
    constructor(queue?: Array<Request>);
    enqueue(req: Request): void;
    reserveFirstReadyItem(): QueueItem | null;
    buffer(n: number): QueueItem[];
    size(): number;
    countInUse(): number;
    countRemainingItems(): number;
    countFinishedItems(): number;
    forEach(fn: (value: QueueItem, index: number) => void): void;
    quickDebug(): string;
    getDebugState(): string;
    serialize(): object[];
    static deserialize(obj: object[]): Queue;
    static empty(): Queue;
}
export { Queue, QueueItem, QueueItemState };
