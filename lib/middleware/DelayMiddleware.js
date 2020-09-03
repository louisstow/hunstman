"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DelayMiddleware = void 0;
const Middleware_1 = require("../Middleware");
class DelayMiddleware extends Middleware_1.Middleware {
    constructor(delay) {
        super();
        this.delay = delay || 100;
    }
    processRequest(r) {
        return new Promise((resolve) => {
            setTimeout(() => resolve(r), this.delay);
        });
    }
}
exports.DelayMiddleware = DelayMiddleware;
