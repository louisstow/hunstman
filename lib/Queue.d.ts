import { Request } from "./Request";
declare class QueueItem {
    request: Request;
    index: number;
    ready: boolean;
    constructor(request: Request, index: number);
}
declare class Queue {
    queue: Array<QueueItem>;
    constructor(queue?: Array<Request>);
    enqueue(req: Request): void;
    dequeue(): QueueItem | null;
    buffer(n: number): QueueItem[];
    purge(): void;
    size(): number;
    free(): number;
    forEach(fn: (value: QueueItem, index: number) => void): void;
    done(): number;
    serialize(): object[];
    static deserialize(obj: object[]): Queue;
    static empty(): Queue;
}
export { Queue, QueueItem };
