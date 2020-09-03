"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Response = void 0;
class Response {
    constructor(request, status, statusText, headers, data, raw) {
        this.request = request;
        this.status = status;
        this.statusText = statusText;
        this.headers = headers;
        this.data = data;
        this.raw = raw;
    }
    serialize() {
        return {
            status: this.status,
            statusText: this.statusText,
            headers: Object.assign({}, this.headers),
            raw: this.raw,
        };
    }
}
exports.Response = Response;
