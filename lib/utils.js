"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = void 0;
const fs_1 = __importDefault(require("fs"));
const Spider_1 = require("./Spider");
const Queue_1 = require("./Queue");
const loadCache = (key) => {
    try {
        const data = JSON.parse(fs_1.default.readFileSync(`.${key}.cache`).toString());
        const out = Queue_1.Queue.deserialize(data);
        return out;
    }
    catch (err) {
        return null;
    }
};
const saveCache = (key, queue) => {
    const d = JSON.stringify(queue.serialize());
    fs_1.default.writeFileSync(`.${key}.cache`, d);
};
const cache = (spider, skip) => {
    const shouldSkip = skip === true;
    const data = loadCache(spider.name);
    if (!data || shouldSkip) {
        spider.once(Spider_1.SpiderEvents.DONE, () => {
            saveCache(spider.name, spider.queue);
        });
        return spider;
    }
    spider.queue = data;
    data.queue.forEach((item) => {
        if (item.request.response && !item.request.response.data) {
            item.request.response.data = item.request.response.raw;
        }
        spider._processResponseMiddleware(item);
        if (item.request.response) {
            spider.results[item.index] = item.request.response;
        }
    });
    return {
        run() {
            spider.state = Spider_1.SpiderState.DONE;
            data.queue.forEach((item) => {
                spider.emit(Spider_1.SpiderEvents.RESPONSE, item.request.response, item);
                spider.emit(Spider_1.SpiderEvents.REQUEST_DONE, item);
            });
            spider.emit(Spider_1.SpiderEvents.DONE, spider.results);
            return Promise.resolve(spider.results);
        },
    };
};
exports.cache = cache;
