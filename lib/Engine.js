"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Engine = exports.DEFAULT_MAX_REQUESTS = exports.EngineState = void 0;
const Settings_1 = require("./Settings");
var EngineState;
(function (EngineState) {
    EngineState[EngineState["WAITING"] = 0] = "WAITING";
    EngineState[EngineState["RUNNING"] = 1] = "RUNNING";
    EngineState[EngineState["PAUSED"] = 2] = "PAUSED";
    EngineState[EngineState["CANCELLED"] = 3] = "CANCELLED";
})(EngineState = exports.EngineState || (exports.EngineState = {}));
exports.DEFAULT_MAX_REQUESTS = 50;
class Engine {
    constructor({ queue, settings, handleItem, }) {
        this.state = EngineState.WAITING;
        this.maxConcurrentRequests = 1;
        this.queue = queue;
        this.maxConcurrentRequests = settings.get(Settings_1.Setting.MAX_CONCURRENT_REQUESTS, exports.DEFAULT_MAX_REQUESTS);
        this.handleItem = handleItem;
    }
    reset() {
        this.state = EngineState.WAITING;
    }
    pause() {
        if (this.isPaused() || this.isCancelled()) {
            return false;
        }
        this.state = EngineState.PAUSED;
        this.pausePromise = new Promise((resolve) => {
            this.pauseResolver = () => resolve();
        });
        return true;
    }
    resume() {
        if (!this.isPaused()) {
            return false;
        }
        this.state = EngineState.RUNNING;
        if (this.pauseResolver) {
            this.pauseResolver();
            return true;
        }
        return false;
    }
    cancel() {
        if (!this.isRunning() && !this.isPaused()) {
            return false;
        }
        if (this.isPaused()) {
            this.resume();
        }
        this.state = EngineState.CANCELLED;
        return true;
    }
    isRunning() {
        return this.state === EngineState.RUNNING;
    }
    isWaiting() {
        return this.state === EngineState.WAITING;
    }
    isPaused() {
        return this.state === EngineState.PAUSED;
    }
    isCancelled() {
        return this.state === EngineState.CANCELLED;
    }
    setQueue(queue) {
        this.queue = queue;
    }
    async run() {
        this.state = EngineState.RUNNING;
        await this.execute();
    }
    async executeFromItem(item, localIndex) {
        await this.handleItem(item, localIndex);
        while (this.queue.countRemainingItems() > 0) {
            if (this.state === EngineState.CANCELLED ||
                this.state === EngineState.PAUSED) {
                break;
            }
            const nextItem = this.queue.reserveFirstReadyItem();
            if (!nextItem) {
                break;
            }
            await this.handleItem(nextItem, localIndex);
        }
    }
    async execute() {
        while (this.queue.countRemainingItems() > 0) {
            if (this.state === EngineState.CANCELLED) {
                break;
            }
            if (this.state === EngineState.PAUSED) {
                if (!this.pausePromise) {
                    throw new Error("Pause has not been correctly set");
                }
                await this.pausePromise;
            }
            const inUse = this.queue.countInUse();
            const items = this.queue.buffer(this.maxConcurrentRequests - inUse);
            await Promise.all(items.map((item, i) => this.executeFromItem(item, i)));
        }
        if (this.state !== EngineState.CANCELLED) {
            this.state = EngineState.WAITING;
        }
    }
}
exports.Engine = Engine;
