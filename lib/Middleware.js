"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Middleware = void 0;
class Middleware {
    processRequest(r, spider, bufferIndex) {
        return Promise.resolve(r);
    }
    processResponse(item, spider) {
        return Promise.resolve(true);
    }
}
exports.Middleware = Middleware;
