"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThrottleMiddleware = void 0;
const Middleware_1 = require("../Middleware");
class ThrottleMiddleware extends Middleware_1.Middleware {
    constructor(spacingMs) {
        super();
        this.spacing = spacingMs || 100;
    }
    processRequest(r, spider, bufferIndex) {
        const diff = Date.now() - spider.stats.lastRequestTime;
        const delay = Math.max(this.spacing - diff, 0) * bufferIndex;
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(r);
            }, delay);
        });
    }
}
exports.ThrottleMiddleware = ThrottleMiddleware;
