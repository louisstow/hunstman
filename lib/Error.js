"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseError = void 0;
class ResponseError extends Error {
    constructor(message, url, status) {
        super(message);
        this.url = url;
        this.status = status;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ResponseError);
        }
    }
    static fromError(srcErr, url, status) {
        const err = new ResponseError(srcErr.message, url, status);
        err.name = srcErr.name;
        err.stack = srcErr.stack;
        return err;
    }
}
exports.ResponseError = ResponseError;
