"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONMiddleware = void 0;
const Middleware_1 = require("../Middleware");
class JSONMiddleware extends Middleware_1.Middleware {
    constructor(requireContentType) {
        super();
        this.requireContentType = true;
        if (requireContentType !== undefined) {
            this.requireContentType = requireContentType;
        }
    }
    processResponse(item) {
        var _a, _b;
        const resp = item.request.response;
        if (resp) {
            if (this.requireContentType &&
                !((_b = (_a = resp.headers) === null || _a === void 0 ? void 0 : _a["content-type"]) === null || _b === void 0 ? void 0 : _b.includes("json"))) {
                return Promise.resolve(true);
            }
            try {
                resp.data = JSON.parse(resp.raw);
            }
            catch (err) {
                return Promise.resolve(false);
            }
        }
        return Promise.resolve(true);
    }
}
exports.JSONMiddleware = JSONMiddleware;
