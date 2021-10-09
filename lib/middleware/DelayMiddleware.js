"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DelayMiddleware = void 0;
const Middleware_1 = require("../Middleware");
class DelayMiddleware extends Middleware_1.Middleware {
    constructor(delayMs, variance) {
        super();
        this.variance = 0.5; // randomly + or - this as a % of delay
        this.delay = delayMs || 100;
        if (variance !== undefined) {
            this.variance = variance;
        }
    }
    calculateDelay() {
        const rand = Math.random() * 2 - 1; // between -1 and 1
        const delta = this.delay * this.variance * rand;
        return Math.round(this.delay + delta);
    }
    processRequest(r) {
        const delay = this.calculateDelay();
        return new Promise((resolve) => {
            setTimeout(() => resolve(r), delay);
        });
    }
}
exports.DelayMiddleware = DelayMiddleware;
