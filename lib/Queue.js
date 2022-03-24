"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueItemState = exports.QueueItem = exports.Queue = void 0;
const Request_1 = require("./Request");
const Response_1 = require("./Response");
var QueueItemState;
(function (QueueItemState) {
    QueueItemState[QueueItemState["READY"] = 0] = "READY";
    QueueItemState[QueueItemState["IN_USE"] = 1] = "IN_USE";
    QueueItemState[QueueItemState["FINISHED"] = 2] = "FINISHED";
})(QueueItemState || (QueueItemState = {}));
exports.QueueItemState = QueueItemState;
class QueueItem {
    constructor(request, index) {
        this.request = request;
        this.index = index;
        this.state = QueueItemState.READY;
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
    reserveFirstReadyItem() {
        const item = this.queue.find((item) => item.state === QueueItemState.READY);
        if (!item) {
            return null;
        }
        item.state = QueueItemState.IN_USE;
        return item;
    }
    buffer(n) {
        const b = [];
        while (n--) {
            const item = this.reserveFirstReadyItem();
            if (!item) {
                break;
            }
            b.push(item);
        }
        return b;
    }
    clearFinished() {
        this.queue = this.queue.filter((item) => item.state !== QueueItemState.FINISHED);
    }
    size() {
        return this.queue.length;
    }
    countInUse() {
        return this.queue.filter((item) => item.state === QueueItemState.IN_USE)
            .length;
    }
    countRemainingItems() {
        return this.queue.filter((item) => item.state !== QueueItemState.FINISHED)
            .length;
    }
    countFinishedItems() {
        return this.queue.filter((item) => item.state === QueueItemState.FINISHED)
            .length;
    }
    forEach(fn) {
        this.queue.forEach(fn);
    }
    getDebugState() {
        const logs = [];
        this.forEach((item, i) => {
            logs.push(`${i}\t${QueueItemState[item.state]}\t${item.request.url.substr(0, 220)}`);
        });
        return logs.join("\n");
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
                if (o.request.responseType) {
                    req.responseType = o.request.responseType;
                }
                if (o.request.response) {
                    const respData = o.request.response;
                    if (req.responseType === "arraybuffer") {
                        respData.raw = Buffer.from(respData.raw);
                    }
                    resp = new Response_1.Response(req, respData.url, respData.status, respData.statusText, respData.headers, null, respData.raw);
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
