"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpiderEvents = exports.Spider = void 0;
const Queue_1 = require("./Queue");
const Request_1 = require("./Request");
const Settings_1 = require("./Settings");
const Error_1 = require("./Error");
const Log_1 = require("./Log");
const Engine_1 = require("./Engine");
var SpiderEvents;
(function (SpiderEvents) {
    SpiderEvents["DONE"] = "done";
    SpiderEvents["SKIP"] = "skip";
    SpiderEvents["RESPONSE"] = "response";
    SpiderEvents["ERROR"] = "fail";
    SpiderEvents["REQUEST_DONE"] = "requestDone";
})(SpiderEvents || (SpiderEvents = {}));
exports.SpiderEvents = SpiderEvents;
const DEFAULT_TIMEOUT = 10000;
class Spider {
    constructor(name, queue, settings, logger) {
        this.handlerErrors = [];
        this.name = name;
        this.queue = Queue_1.Queue.empty();
        this.settings = settings || new Settings_1.Settings();
        this.logger =
            logger ||
                this.settings.get("logger", undefined) ||
                new Log_1.ConsoleLogger(`[${this.name}]`);
        this.engine = new Engine_1.Engine({
            queue: this.queue,
            settings: this.settings,
            handleItem: async (item, bufferIndex) => {
                await this.runQueueItem(item, bufferIndex);
            },
        });
        if (queue) {
            this.setQueue(queue);
        }
        this.middleware = [...Spider._defaultMiddleware];
        this.results = [];
        this.handlers = {};
        this.history = [];
        this.stats = {
            numSuccessfulRequests: 0,
            numFailedRequests: 0,
            numRequests: 0,
            lastRequestTime: 0,
            startSpiderTime: 0,
            endSpiderTime: 0,
        };
        // global middleware from settings
        if (this.settings.get(Settings_1.Setting.MIDDLEWARE, false)) {
            const middleware = this.settings.get(Settings_1.Setting.MIDDLEWARE, []);
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
        this.engine.setQueue(this.queue);
    }
    addMiddleware(middleware) {
        this.middleware.push(middleware);
    }
    removeMiddleware(index) {
        this.middleware.splice(index, 1);
    }
    replaceMiddleware(index, middleware) {
        this.middleware[index] = middleware;
    }
    pause() {
        this.engine.pause();
    }
    resume() {
        this.engine.resume();
    }
    cancel() {
        this.queue.forEach((item) => {
            item.setFinished();
            item.request.cancel();
            item.request.reset();
        });
        this.engine.cancel();
    }
    reset() {
        this.queue.forEach((item) => {
            item.setReady();
            item.request.reset();
        });
        this.results = [];
        this.history.length = 0;
        this.handlerErrors.length = 0;
        this.engine.reset();
    }
    purge() {
        this.queue.forEach((item) => {
            if (item.state === Queue_1.QueueItemState.FINISHED) {
                if (item.request.response)
                    item.request.response.data = null;
                delete this.results[item.index];
            }
        });
    }
    pushHistory(msg) {
        this.history.push(`[${Date.now()}] ${msg}`);
    }
    async executeResponseHandler(fn, response, item) {
        try {
            await fn(response, item);
        }
        catch (err) {
            const respErr = Error_1.ResponseError.create(err, response.request.url, response.status);
            await this.emit(SpiderEvents.ERROR, respErr);
            response.request.emit(SpiderEvents.ERROR, respErr);
        }
    }
    async emitResponse(response, item) {
        const fns = this.handlers[SpiderEvents.RESPONSE] || [];
        await Promise.all(fns.map((f) => this.executeResponseHandler(f, response, item)));
    }
    async emit(event, ...args) {
        if (event === SpiderEvents.RESPONSE) {
            return this.emitResponse(args[0], args[1]);
        }
        const fns = this.handlers[event] || [];
        try {
            await Promise.all(fns.map((f) => f(...args)));
        }
        catch (err) {
            this.handlerErrors.push(Error_1.HandlerError.create(err, event));
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
        const proxy = this.settings.get(Settings_1.Setting.PROXY, null);
        const timeout = this.settings.get(Settings_1.Setting.TIMEOUT, DEFAULT_TIMEOUT);
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
    async handleSpiderFinished() {
        await this.emit(SpiderEvents.DONE, this.results);
    }
    async runRequestMiddleware(item, bufferIndex) {
        let r = item.request;
        for (let i = 0; i < this.middleware.length; ++i) {
            r = await this.middleware[i].processRequest(r, this, bufferIndex);
            // exit immediately on null
            if (r === null) {
                this.pushHistory(`${item.index} failed request middleware`);
                return null;
            }
        }
        this.pushHistory(`${item.index} passed request middleware`);
        return r;
    }
    async runResponseMiddleware(item) {
        for (let i = 0; i < this.middleware.length; ++i) {
            const passes = await this.middleware[i].processResponse(item, this);
            if (!passes) {
                this.pushHistory(`${item.index} failed response middleware`);
                return false;
            }
        }
        this.pushHistory(`${item.index} passed response middleware`);
        return true;
    }
    async runQueueItem(item, bufferIndex) {
        const req = await this.runRequestMiddleware(item, bufferIndex);
        let resp = null;
        let passes = false;
        if (req === null) {
            this.skipQueueItem(item);
            return;
        }
        try {
            this.pushHistory(`${item.index} start request`);
            resp = await req.run();
            item.setFinished();
            this.pushHistory(`${item.index} finished request`);
            // do not trigger or continue processing if
            // the spider is cancelled
            if (this.engine.isCancelled()) {
                return;
            }
            passes = await this.runResponseMiddleware(item);
        }
        catch (err) {
            item.setFinished();
            if (this.engine.isCancelled()) {
                return;
            }
            this.pushHistory(`${item.index} failed request`);
            if (item.request.response) {
                this.results[item.index] = item.request.response;
            }
            await this.runResponseMiddleware(item);
            const crawlErr = Error_1.CrawlError.create(err, req);
            await this.emit(SpiderEvents.ERROR, crawlErr);
            req.emit(SpiderEvents.ERROR, crawlErr);
            this.stats.numFailedRequests++;
        }
        if (passes && resp) {
            this.results[item.index] = resp;
            this.stats.numSuccessfulRequests++;
            await this.emitResponse(resp, item);
        }
        this.emit(SpiderEvents.REQUEST_DONE, item);
        req.emit(SpiderEvents.REQUEST_DONE, item);
        this.stats.lastRequestTime = Date.now();
        this.stats.numRequests++;
    }
    async run(queue) {
        if (this.engine.isRunning()) {
            const debugState = `${this.queue.getDebugState()}\nHistory: ${this.history.join("\n")}}`;
            throw new Error(`${this.name} is already running:\n${debugState}`);
        }
        this.reset();
        // if a requestable is passed in, override our queue
        if (queue) {
            this.setQueue(queue);
        }
        if (!this.queue.size()) {
            throw new Error("Queue is empty");
        }
        this.applySettingsToQueueRequests();
        this.stats.startSpiderTime = Date.now();
        await this.engine.run();
        await this.handleSpiderFinished();
        this.stats.endSpiderTime = Date.now();
        return this.results;
    }
    static setDefaultMiddleware(middleware) {
        Spider._defaultMiddleware = middleware;
    }
    static clearDefaultMiddleware() {
        Spider._defaultMiddleware = [];
    }
}
exports.Spider = Spider;
Spider._defaultMiddleware = [];
