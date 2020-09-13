"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueItem = exports.Queue = void 0;
const Request_1 = require("./Request");
const Response_1 = require("./Response");
class QueueItem {
    constructor(request, index) {
        this.request = request;
        this.index = index;
        this.ready = true;
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
        const item = this.queue.find((item) => item.ready);
        if (!item) {
            return null;
        }
        item.ready = false;
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
    purge() {
        this.queue = this.queue.filter((item) => item.ready);
    }
    size() {
        return this.queue.length;
    }
    free() {
        return this.queue.filter((item) => item.ready).length;
    }
    forEach(fn) {
        this.queue.forEach(fn);
    }
    done() {
        return this.queue.filter((item) => item.request.state !== Request_1.RequestState.REQUESTING &&
            item.request.state !== Request_1.RequestState.WAITING).length;
    }
    serialize() {
        return this.queue.map((item) => ({
            index: item.index,
            request: item.request.serialize(),
        }));
    }
    static deserialize(obj) {
        const items = obj
            .map((o) => {
            let req, resp;
            if (o.request) {
                req = new Request_1.Request(o.request.url, o.request.method, o.request.data);
                if (o.request.headers) {
                    req.headers = o.request.headers;
                }
                if (o.request.meta) {
                    req.meta = o.request.meta;
                }
                if (o.request.response) {
                    const respData = o.request.response;
                    resp = new Response_1.Response(req, respData.status, respData.statusText, respData.headers, null, respData.raw);
                    req.response = resp;
                }
                return new QueueItem(req, o.index);
            }
            return null;
        })
            .filter((item) => item !== null);
        const q = new Queue();
        q.queue = items;
        return q;
    }
    static empty() {
        return new Queue([]);
    }
}
exports.Queue = Queue;
