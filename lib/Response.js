"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Response = void 0;
class Response {
    constructor(status, statusText, headers, data) {
        this.status = status;
        this.statusText = statusText;
        this.headers = headers;
        this.data = data;
    }
}
exports.Response = Response;
