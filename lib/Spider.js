"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpiderState = exports.SpiderEvents = exports.Spider = void 0;
const Queue_1 = require("./Queue");
const Request_1 = require("./Request");
const Settings_1 = require("./Settings");
const Error_1 = require("./Error");
const Log_1 = require("./Log");
var SpiderState;
(function (SpiderState) {
    SpiderState[SpiderState["IDLE"] = 0] = "IDLE";
    SpiderState[SpiderState["CRAWLING"] = 1] = "CRAWLING";
    SpiderState[SpiderState["CANCELLED"] = 2] = "CANCELLED";
    SpiderState[SpiderState["PAUSED"] = 3] = "PAUSED";
    SpiderState[SpiderState["DONE"] = 4] = "DONE";
})(SpiderState || (SpiderState = {}));
exports.SpiderState = SpiderState;
var SpiderEvents;
(function (SpiderEvents) {
    SpiderEvents["DONE"] = "done";
    SpiderEvents["SKIP"] = "skip";
    SpiderEvents["RESPONSE"] = "response";
    SpiderEvents["ERROR"] = "fail";
    SpiderEvents["REQUEST_DONE"] = "requestDone";
})(SpiderEvents || (SpiderEvents = {}));
exports.SpiderEvents = SpiderEvents;
const DEFAULT_MAX_REQUESTS = 50;
const DEFAULT_TIMEOUT = 10000;
class Spider {
    constructor(name, queue, settings, logger) {
        this.name = name;
        this.queue = Queue_1.Queue.empty();
        if (queue) {
            this.setQueue(queue);
        }
        this.settings = settings || new Settings_1.Settings();
        this.logger = new Log_1.Log(`[${this.name}]`, logger);
        this.state = SpiderState.IDLE;
        this.middleware = [];
        this.results = [];
        this.handlers = {};
        this.handlerPromises = [];
        this.stats = {
            numSuccessfulRequests: 0,
            numFailedRequests: 0,
            numRequests: 0,
            lastRequestTime: 0,
            startSpiderTime: 0,
            endSpiderTime: 0,
        };
        // global middleware from settings
        if (this.settings.get("middleware", false)) {
            const middleware = this.settings.get("middleware", []);
            middleware.forEach((m) => this.addMiddleware(m));
        }
    }
    setQueue(queue) {
        if (queue instanceof Request_1.Request) {
            this.queue = new Queue_1.Queue([queue]);
        }
        else if (Array.isArray(queue)) {
            this.queue = new Queue_1.Queue(queue);
        }
        else if (queue instanceof Queue_1.Queue) {
            this.queue = queue;
        }
    }
    addMiddleware(middleware) {
        this.middleware.push(middleware);
    }
    pause() {
        this.state = SpiderState.PAUSED;
    }
    async resume() {
        this.state = SpiderState.CRAWLING;
        await this.crawlNextItems();
    }
    cancel() {
        this.state = SpiderState.CANCELLED;
        this.queue.forEach((item) => {
            if (item.request.state === Request_1.RequestState.REQUESTING) {
                item.state = Queue_1.QueueItemState.FINISHED;
            }
            item.request.cancel();
            item.request.reset();
        });
    }
    reset() {
        this.state = SpiderState.IDLE;
        this.queue.forEach((item) => {
            item.state = Queue_1.QueueItemState.READY;
            item.request.reset();
        });
        this.handlerPromises.length = 0;
    }
    purge() {
        this.queue.forEach((item) => {
            if (item.state === Queue_1.QueueItemState.FINISHED) {
                if (item.request.response)
                    item.request.response.data = null;
                delete this.results[item.index];
            }
        });
        this.queue.clearFinished();
    }
    async executeResponseHandler(f, response, item) {
        try {
            await f(item);
        }
        catch (err) {
            if (err instanceof Error) {
                throw Error_1.ResponseError.fromError(err, response.request.url, response.status);
            }
            else {
                throw err;
            }
        }
    }
    emitResponse(response, item) {
        const fns = this.handlers[SpiderEvents.RESPONSE] || [];
        for (const f of fns) {
            this.handlerPromises.push(this.executeResponseHandler(f, response, item));
        }
    }
    emit(event, ...args) {
        if (event === SpiderEvents.RESPONSE) {
            return this.emitResponse(args[0], args[1]);
        }
        const fns = this.handlers[event] || [];
        for (const f of fns) {
            this.handlerPromises.push(f(...args));
        }
    }
    on(event, cb) {
        if (!this.handlers[event]) {
            this.handlers[event] = [];
        }
        this.handlers[event].push(cb);
    }
    off(event, cb) {
        const fns = this.handlers[event] || [];
        const index = fns.indexOf(cb);
        if (index > -1) {
            this.handlers[event].splice(index, 1);
        }
    }
    once(event, cb) {
        this.on(event, async () => {
            this.off(event, cb);
            await cb();
        });
    }
    applySettingsToQueueRequests() {
        const proxy = this.settings.get("proxy", null);
        const timeout = this.settings.get("timeout", DEFAULT_TIMEOUT);
        this.queue.forEach((item) => {
            if (proxy) {
                item.request.setProxy(proxy);
            }
            item.request.setTimeout(timeout);
        });
    }
    skipQueueItem(item) {
        this.emit(SpiderEvents.SKIP, item);
        item.state = Queue_1.QueueItemState.FINISHED;
        item.request.state = Request_1.RequestState.SKIPPED;
    }
    handleSpiderFinished() {
        this.state = SpiderState.DONE;
        this.emit(SpiderEvents.DONE, this.results);
    }
    checkSpiderFinished() {
        const remaining = this.queue.countRemainingItems();
        if (remaining === 0) {
            this.handleSpiderFinished();
            return true;
        }
        return false;
    }
    async crawlNextItems() {
        if (this.state === SpiderState.CANCELLED ||
            this.state === SpiderState.PAUSED) {
            return;
        }
        const maxRequests = this.settings.get("maxRequests", DEFAULT_MAX_REQUESTS);
        const inUse = this.queue.countInUse();
        const reserve = Math.max(maxRequests - inUse, 0);
        const buffer = this.queue.buffer(reserve);
        if (buffer.length === 0) {
            this.checkSpiderFinished();
            return;
        }
        await Promise.all(buffer.map((item, i) => this.runQueueItem(item, i)));
    }
    async runRequestMiddleware(item, bufferIndex) {
        let r = item.request;
        for (let i = 0; i < this.middleware.length; ++i) {
            r = await this.middleware[i].processRequest(r, this, bufferIndex);
            // exit immediately on null
            if (r === null) {
                return null;
            }
        }
        return r;
    }
    async runResponseMiddleware(item) {
        for (let i = 0; i < this.middleware.length; ++i) {
            const passes = await this.middleware[i].processResponse(item, this);
            if (!passes) {
                return false;
            }
        }
        return true;
    }
    async runQueueItem(item, bufferIndex) {
        const req = await this.runRequestMiddleware(item, bufferIndex);
        if (req === null) {
            this.skipQueueItem(item);
            await this.crawlNextItems();
            return;
        }
        try {
            const resp = await req.run();
            item.state = Queue_1.QueueItemState.FINISHED;
            // do not trigger or continue processing if
            // the spider is cancelled
            if (this.state === SpiderState.CANCELLED) {
                return;
            }
            const passes = await this.runResponseMiddleware(item);
            if (passes && resp) {
                this.results[item.index] = resp;
                this.emit(SpiderEvents.RESPONSE, resp, item);
                req.emit(SpiderEvents.REQUEST_DONE, resp, item);
                this.stats.numSuccessfulRequests++;
            }
        }
        catch (err) {
            item.state = Queue_1.QueueItemState.FINISHED;
            if (this.state === SpiderState.CANCELLED) {
                return;
            }
            if (item.request.response) {
                this.results[item.index] = item.request.response;
            }
            await this.runResponseMiddleware(item);
            this.emit(SpiderEvents.ERROR, err, item);
            req.emit(SpiderEvents.ERROR, err, item);
            this.stats.numFailedRequests++;
        }
        this.emit(SpiderEvents.REQUEST_DONE, item);
        req.emit(SpiderEvents.REQUEST_DONE, item);
        this.stats.lastRequestTime = Date.now();
        this.stats.numRequests++;
        await this.crawlNextItems();
    }
    async run(queue) {
        if (this.state === SpiderState.CRAWLING) {
            const debugState = this.queue.getDebugState();
            throw new Error(`${this.name} is already running:\n${debugState}`);
        }
        // if a requestable is passed in, override our queue
        if (queue) {
            this.setQueue(queue);
        }
        if (!this.queue.size()) {
            throw new Error("Queue is empty");
        }
        this.applySettingsToQueueRequests();
        this.state = SpiderState.CRAWLING;
        this.stats.startSpiderTime = Date.now();
        await this.crawlNextItems();
        this.stats.endSpiderTime = Date.now();
        await Promise.all(this.handlerPromises);
        this.handlerPromises.length = 0;
        return this.results;
    }
}
exports.Spider = Spider;
