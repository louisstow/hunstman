"use strict";
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
        if (queue instanceof Request_1.Request) {
            this.queue = new Queue_1.Queue([queue]);
        }
        else if (Array.isArray(queue)) {
            this.queue = new Queue_1.Queue(queue);
        }
        else if (queue instanceof Queue_1.Queue) {
            this.queue = queue;
        }
        else {
            this.queue = Queue_1.Queue.empty();
        }
        this.settings = settings || new Settings_1.Settings();
        this.logger = new Log_1.Log(`[${this.name}]`, logger);
        this.state = SpiderState.IDLE;
        this.middleware = [];
        this.results = [];
        this.resolver = null;
        // global middleware from settings
        if (this.settings.get("middleware", false)) {
            const middleware = this.settings.get("middleware", []);
            middleware.forEach((m) => this.addMiddleware(m));
        }
    }
    addMiddleware(middleware) {
        this.middleware.push(middleware);
    }
    pause() {
        this.state = SpiderState.PAUSED;
    }
    resume() {
        if (!this.resolver) {
            throw new Error("Missing resolver to resume");
        }
        this.state = SpiderState.CRAWLING;
        const buffer = this.queue.buffer(this.settings.get("maxRequests", DEFAULT_MAX_REQUESTS));
        if (!buffer.length) {
            this._onDone(this.resolver);
        }
        buffer.forEach((item) => this.resolver && this._processItem(this.resolver, item));
    }
    cancel() {
        this.state = SpiderState.CANCELLED;
        this.queue.forEach((item) => {
            if (item.request.state === Request_1.RequestState.REQUESTING) {
                item.ready = true;
            }
            item.request.cancel();
        });
    }
    reset() {
        this.state = SpiderState.IDLE;
        this.resolver = null;
        this.queue.forEach((item) => {
            item.ready = true;
        });
    }
    stats() { }
    _onDone(resolve) {
        this.state = SpiderState.DONE;
        this.emit(SpiderEvents.DONE, this.results);
        resolve(this.results);
        this.resolver = null;
    }
    _processResponseMiddleware(item) {
        for (let i = 0; i < this.middleware.length; ++i) {
            if (!this.middleware[i].processResponse(item, this)) {
                break;
            }
        }
        return true;
    }
    _processItem(resolve, item) {
        let p = Promise.resolve(item.request);
        this.middleware.forEach((m) => {
            p = p
                .then((r) => m.processRequest(r))
                .catch(() => {
                return null;
            });
        });
        p.then((r) => {
            if (r === null) {
                this.emit(SpiderEvents.SKIP, item);
                item.request.state = Request_1.RequestState.SKIPPED;
                return false;
            }
            r.run()
                .then((out) => {
                // run middleware on response / error
                return this._processResponseMiddleware(item);
            })
                .then((passes) => {
                if (passes && item.request.response) {
                    this.results[item.index] = item.request.response;
                    this.emit(SpiderEvents.RESPONSE, this.results[item.index], item);
                }
                return passes;
            })
                .catch((err) => {
                if (item.request.response) {
                    this.results[item.index] = item.request.response;
                }
                this._processResponseMiddleware(item);
                this.emit(SpiderEvents.ERROR, err, item);
            })
                .then(() => {
                this.emit(SpiderEvents.REQUEST_DONE, item);
                if (this.state === SpiderState.CANCELLED ||
                    this.state === SpiderState.PAUSED) {
                    return;
                }
                const nextItem = this.queue.dequeue();
                if (nextItem) {
                    this._processItem(resolve, nextItem);
                }
                else {
                    const done = this.queue.done();
                    const free = this.queue.free();
                    const size = this.queue.size();
                    if (done === size && free === 0) {
                        this._onDone(resolve);
                    }
                }
            });
        });
    }
    run(queue) {
        if (this.state === SpiderState.CRAWLING) {
            throw new Error("Spider is already running");
        }
        // if a requestable is passed in, override our queue
        if (queue) {
            if (queue instanceof Queue_1.Queue) {
                this.queue = queue;
            }
            else if (queue instanceof Request_1.Request) {
                this.queue = new Queue_1.Queue([queue]);
            }
            else {
                this.queue = new Queue_1.Queue(queue);
            }
        }
        if (!this.queue.size()) {
            throw new Error("Queue is empty");
        }
        // initialize the proxy settings on the requests
        if (this.settings.get("proxy", false)) {
            const proxy = this.settings.get("proxy");
            const timeout = this.settings.get("timeout", DEFAULT_TIMEOUT);
            this.queue.queue.forEach((item) => {
                item.request.setProxy(proxy);
                item.request.setTimeout(timeout);
            });
        }
        this.state = SpiderState.CRAWLING;
        const promise = new Promise((resolve) => {
            this.resolver = resolve;
            const buffer = this.queue.buffer(this.settings.get("maxRequests", DEFAULT_MAX_REQUESTS));
            if (!buffer.length) {
                this._onDone(resolve);
            }
            buffer.forEach((item) => this._processItem(resolve, item));
        });
        return promise;
    }
}
exports.Spider = Spider;
