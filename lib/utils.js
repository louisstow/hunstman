"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const Spider_1 = require("./Spider");
const Queue_1 = require("./Queue");
const Settings_1 = require("./Settings");
const DEFAULT_CACHE_PATH = "__fixtures__";
const loadCache = (key, settings) => {
    try {
        const cachePath = settings.get(Settings_1.Setting.CACHE_PATH, DEFAULT_CACHE_PATH);
        const data = JSON.parse(fs_1.default.readFileSync(path_1.default.join(cachePath, `.${key}.cache`)).toString());
        const out = Queue_1.Queue.deserialize(data);
        return out;
    }
    catch (err) {
        console.warn(`Could not load from cache: ${key}`);
        return null;
    }
};
const saveCache = (key, queue, settings) => {
    const cachePath = settings.get(Settings_1.Setting.CACHE_PATH, DEFAULT_CACHE_PATH);
    try {
        const d = JSON.stringify(queue.serialize());
        fs_1.default.writeFileSync(path_1.default.join(cachePath, `.${key}.cache`), d);
    }
    catch (err) {
        console.warn(`Could not save to cache: ${key}`);
    }
};
const cache = (spider, skip) => {
    if (skip === true) {
        return spider;
    }
    const data = loadCache(spider.name, spider.settings);
    if (!data) {
        spider.once(Spider_1.SpiderEvents.DONE, async () => {
            saveCache(spider.name, spider.queue, spider.settings);
        });
        return spider;
    }
    spider.queue = data;
    return {
        async run() {
            for (let i = 0; i < data.queue.length; ++i) {
                const item = data.queue[i];
                if (item.request.response && !item.request.response.data) {
                    item.request.response.data = item.request.response.raw;
                }
                // @ts-ignore
                await spider.runResponseMiddleware(item);
                if (item.request.response) {
                    spider.results[item.index] = item.request.response;
                }
                await spider.emit(Spider_1.SpiderEvents.RESPONSE, item.request.response, item);
                spider.emit(Spider_1.SpiderEvents.REQUEST_DONE, item);
            }
            spider.emit(Spider_1.SpiderEvents.DONE, spider.results);
            return spider.results;
        },
    };
};
exports.cache = cache;
