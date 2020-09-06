"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Middleware = void 0;
class Middleware {
    processRequest(r, spider) {
        return Promise.resolve(r);
    }
    processResponse(item, spider) {
        return true;
    }
}
exports.Middleware = Middleware;
