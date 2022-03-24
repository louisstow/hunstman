"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyListMiddleware = void 0;
const Middleware_1 = require("../Middleware");
const Queue_1 = require("../Queue");
class ProxyListMiddleware extends Middleware_1.Middleware {
    constructor(proxyList, rotateProxyCodes) {
        super();
        this.rotateProxyCodes = [400, 403, 429];
        this.attempts = {};
        this.maxAttempts = 3;
        this.proxyList = proxyList;
        if (rotateProxyCodes) {
            this.rotateProxyCodes = rotateProxyCodes;
        }
    }
    processRequest(r, spider) {
        r.setProxy(this.proxyList[(Math.random() * this.proxyList.length) | 0]);
        return Promise.resolve(r);
    }
    processResponse(item, spider) {
        const req = item.request;
        const resp = req.response;
        // if a request fails, remove the proxy from the list
        if (item.request.proxy &&
            ((resp && this.rotateProxyCodes.includes(resp.status)) || req.error)) {
            if (!this.attempts[item.request.proxy]) {
                this.attempts[item.request.proxy] = 0;
            }
            spider.logger.info("Failed attempt", item.request.proxy, req.error?.code);
            this.attempts[item.request.proxy]++;
            if (this.attempts[item.request.proxy] >= this.maxAttempts) {
                this.proxyList = this.proxyList.filter((p) => p !== item.request.proxy);
                spider.logger.info("proxy list removing", item.request.proxy);
                spider.logger.info("new proxy list size", this.proxyList.length);
            }
            item.state = Queue_1.QueueItemState.READY;
            return Promise.resolve(false);
        }
        return Promise.resolve(true);
    }
}
exports.ProxyListMiddleware = ProxyListMiddleware;
