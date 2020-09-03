"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryMiddleware = void 0;
const Middleware_1 = require("../Middleware");
class RetryMiddleware extends Middleware_1.Middleware {
    constructor(numTimes, retryCodes) {
        super();
        this.numTimes = 5;
        this.retryCodes = [500, 502, 503, 504, 522, 524, 408, 429, 400, 403];
        this.attempts = {};
        if (numTimes) {
            this.numTimes = numTimes;
        }
        if (retryCodes) {
            this.retryCodes = retryCodes;
        }
    }
    processResponse(item) {
        if (item.request.response &&
            this.retryCodes.includes(item.request.response.status)) {
            // keep track of attempts
            if (!this.attempts[item.request.url]) {
                this.attempts[item.request.url] = 0;
            }
            else if (this.attempts[item.request.url] >= this.numTimes) {
                return true;
            }
            item.ready = true;
            this.attempts[item.request.url]++;
            return false;
        }
        return true;
    }
}
exports.RetryMiddleware = RetryMiddleware;
