"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueItem = exports.Queue = void 0;
const Request_1 = require("./Request");
class QueueItem {
    constructor(request, index) {
        this.request = request;
        this.index = index;
        this.free = true;
    }
}
exports.QueueItem = QueueItem;
class Queue {
    constructor(queue) {
        this.queue = [];
        if (queue) {
            queue.forEach((r) => this.enqueue(r));
        }
    }
    enqueue(req) {
        const index = this.queue.length;
        const item = new QueueItem(req, index);
        this.queue.push(item);
    }
    dequeue() {
        const item = this.queue.find((item) => item.free);
        if (!item) {
            return null;
        }
        item.free = false;
        return item;
    }
    buffer(n) {
        const b = [];
        while (n--) {
            const item = this.dequeue();
            if (!item) {
                break;
            }
            b.push(item);
        }
        return b;
    }
    size() {
        return this.queue.length;
    }
    free() {
        return this.queue.filter((item) => !!item.free).length;
    }
    done() {
        return this.queue.filter((item) => item.request.state !== Request_1.RequestState.REQUESTING &&
            item.request.state !== Request_1.RequestState.WAITING).length;
    }
    static empty() {
        return new Queue([]);
    }
}
exports.Queue = Queue;
