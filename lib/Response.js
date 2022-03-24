"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Response = void 0;
const url_1 = require("url");
const path_1 = __importDefault(require("path"));
class Response {
    constructor(request, url, status, statusText, headers, data, raw) {
        this.request = request;
        this.url = url;
        this.status = status;
        this.statusText = statusText;
        this.headers = headers;
        this.data = data;
        this.raw = raw;
    }
    urljoin(u) {
        if (u.match(/^https?:\/\//)) {
            return u;
        }
        const url = new url_1.URL(this.url);
        if (u.startsWith("/")) {
            return `${url.origin}${u}`;
        }
        return `${url.origin}${path_1.default.join(url.pathname, u)}`;
    }
    serialize() {
        return {
            url: this.url,
            status: this.status,
            statusText: this.statusText,
            headers: { ...this.headers },
            raw: this.raw,
        };
    }
}
exports.Response = Response;
