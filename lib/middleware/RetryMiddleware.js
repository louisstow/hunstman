"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryMiddleware = void 0;
const Middleware_1 = require("../Middleware");
class RetryMiddleware extends Middleware_1.Middleware {
    constructor(numTimes, retryStatusCodes) {
        super();
        this.numTimes = 5;
        this.retryStatusCodes = [
            500,
            502,
            503,
            504,
            522,
            524,
            408,
            429,
            400,
            403,
        ];
        this.retryErrorCodes = ["ECONNABORTED", "ETIMEDOUT"];
        this.attempts = {};
        if (numTimes) {
            this.numTimes = numTimes;
        }
        if (retryStatusCodes) {
            this.retryStatusCodes = retryStatusCodes;
        }
    }
    processResponse(item) {
        const req = item.request;
        const resp = req.response;
        if ((resp && this.retryStatusCodes.includes(resp.status)) ||
            (req.error && this.retryErrorCodes.includes(req.error.code || ""))) {
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
