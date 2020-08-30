import { Request } from "./Request";
declare class QueueItem {
    request: Request;
    index: number;
    free: boolean;
    constructor(request: Request, index: number);
}
declare class Queue {
    queue: Array<QueueItem>;
    constructor(queue?: Array<Request>);
    enqueue(req: Request): void;
    dequeue(): QueueItem | null;
    buffer(n: number): QueueItem[];
    size(): number;
    free(): number;
    done(): number;
    static empty(): Queue;
}
export { Queue, QueueItem };
