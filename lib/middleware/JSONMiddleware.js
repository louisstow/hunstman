"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONMiddleware = void 0;
const Middleware_1 = require("../Middleware");
class JSONMiddleware extends Middleware_1.Middleware {
    processResponse(item) {
        const resp = item.request.response;
        if (resp && item.request.headers["content-type"].includes("/json")) {
            try {
                resp.data = JSON.parse(resp.data);
            }
            catch (err) {
                return false;
            }
        }
        return true;
    }
}
exports.JSONMiddleware = JSONMiddleware;
