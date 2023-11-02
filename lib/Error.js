"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandlerError = exports.CrawlError = exports.ResponseError = void 0;
class ResponseError extends Error {
    constructor(message, url, status) {
        super(message);
        this.url = url;
        this.status = status;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ResponseError);
        }
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            stack: this.stack,
            url: this.url,
            status: this.status,
        };
    }
    static create(src, url, status) {
        if (typeof src === "string") {
            return new ResponseError(src, url, status);
        }
        if (src instanceof Error) {
            const err = new ResponseError(src.message, url, status);
            err.name = src.name;
            err.stack = src.stack;
            return err;
        }
        return new ResponseError(`Unknown: (${src})`, url, status);
    }
}
exports.ResponseError = ResponseError;
class CrawlError extends Error {
    constructor(message, request) {
        super(message);
        this.request = request;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, CrawlError);
        }
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            stack: this.stack,
            url: this.request.url,
            status: this.request.response?.status,
        };
    }
    static create(src, request) {
        if (typeof src === "string") {
            return new CrawlError(src, request);
        }
        if (src instanceof Error) {
            const err = new CrawlError(src.message, request);
            err.name = src.name;
            err.stack = src.stack;
            return err;
        }
        return new CrawlError(`Unknown: (${src})`, request);
    }
}
exports.CrawlError = CrawlError;
class HandlerError extends Error {
    constructor(message, event) {
        super(message);
        this.event = event;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, HandlerError);
        }
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            stack: this.stack,
            event: this.event,
        };
    }
    static create(src, event) {
        if (typeof src === "string") {
            return new HandlerError(src, event);
        }
        if (src instanceof Error) {
            const err = new HandlerError(src.message, event);
            err.name = src.name;
            err.stack = src.stack;
            return err;
        }
        return new HandlerError(`Unknown: (${src})`, event);
    }
}
exports.HandlerError = HandlerError;
