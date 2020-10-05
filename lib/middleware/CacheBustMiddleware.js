"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheBustMiddleware = void 0;
const Middleware_1 = require("../Middleware");
const url_1 = require("url");
class CacheBustMiddleware extends Middleware_1.Middleware {
    processRequest(r) {
        const reqUrl = new url_1.URL(r.url);
        reqUrl.searchParams.set("_cache", String(Date.now()));
        r.url = reqUrl.href;
        return Promise.resolve(r);
    }
}
exports.CacheBustMiddleware = CacheBustMiddleware;
