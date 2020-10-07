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
    if (skip === true) {
        return spider;
    }
    const data = loadCache(spider.name);
    if (!data) {
        spider.once(Spider_1.SpiderEvents.DONE, () => {
            saveCache(spider.name, spider.queue);
        });
        return spider;
    }
    spider.queue = data;
    return {
        run() {
            return __awaiter(this, void 0, void 0, function* () {
                spider.state = Spider_1.SpiderState.DONE;
                for (let i = 0; i < data.queue.length; ++i) {
                    const item = data.queue[i];
                    if (item.request.response && !item.request.response.data) {
                        item.request.response.data = item.request.response.raw;
                    }
                    // @ts-ignore
                    yield spider.runResponseMiddleware(item);
                    if (item.request.response) {
                        spider.results[item.index] = item.request.response;
                    }
                    spider.emit(Spider_1.SpiderEvents.RESPONSE, item.request.response, item);
                    spider.emit(Spider_1.SpiderEvents.REQUEST_DONE, item);
                }
                spider.emit(Spider_1.SpiderEvents.DONE, spider.results);
                return spider.results;
            });
        },
    };
};
exports.cache = cache;
