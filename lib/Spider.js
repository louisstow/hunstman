"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpiderState = exports.SpiderEvents = exports.Spider = void 0;
const Queue_1 = require("./Queue");
const Request_1 = require("./Request");
const Settings_1 = require("./Settings");
const events_1 = require("events");
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
class Spider extends events_1.EventEmitter {
    constructor(name, queue, settings, logger) {
        super();
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
    resume() {
        return __awaiter(this, void 0, void 0, function* () {
            this.state = SpiderState.CRAWLING;
            yield this.crawlNextItems();
        });
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
        }
    }
    crawlNextItems() {
        return __awaiter(this, void 0, void 0, function* () {
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
            yield Promise.all(buffer.map((item) => this.runQueueItem(item)));
        });
    }
    runRequestMiddleware(item) {
        return __awaiter(this, void 0, void 0, function* () {
            let r = item.request;
            for (let i = 0; i < this.middleware.length; ++i) {
                r = yield this.middleware[i].processRequest(r, this);
                // exit immediately on null
                if (r === null) {
                    return null;
                }
            }
            return r;
        });
    }
    runResponseMiddleware(item) {
        return __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < this.middleware.length; ++i) {
                const passes = yield this.middleware[i].processResponse(item, this);
                if (!passes) {
                    return false;
                }
            }
            return true;
        });
    }
    runQueueItem(item) {
        return __awaiter(this, void 0, void 0, function* () {
            const req = yield this.runRequestMiddleware(item);
            if (req === null) {
                this.skipQueueItem(item);
                return;
            }
            try {
                const resp = yield req.run();
                item.state = Queue_1.QueueItemState.FINISHED;
                // do not trigger or continue processing if
                // the spider is cancelled
                if (this.state === SpiderState.CANCELLED) {
                    return;
                }
                const passes = yield this.runResponseMiddleware(item);
                if (passes && resp) {
                    this.results[item.index] = resp;
                    this.emit(SpiderEvents.RESPONSE, resp, item);
                }
            }
            catch (err) {
                if (this.state === SpiderState.CANCELLED) {
                    return;
                }
                if (item.request.response) {
                    this.results[item.index] = item.request.response;
                }
                item.state = Queue_1.QueueItemState.FINISHED;
                yield this.runResponseMiddleware(item);
                this.emit(SpiderEvents.ERROR, err, item);
            }
            this.emit(SpiderEvents.REQUEST_DONE, item);
            yield this.crawlNextItems();
        });
    }
    run(queue) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.state === SpiderState.CRAWLING) {
                throw new Error("Spider is already running");
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
            yield this.crawlNextItems();
            return this.results;
        });
    }
}
exports.Spider = Spider;
