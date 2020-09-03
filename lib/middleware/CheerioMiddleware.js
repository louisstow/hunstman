"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheerioMiddleware = void 0;
const Middleware_1 = require("../Middleware");
const cheerio_1 = __importDefault(require("cheerio"));
class CheerioMiddleware extends Middleware_1.Middleware {
    processResponse(item) {
        var _a, _b;
        const resp = item.request.response;
        if (resp && ((_b = (_a = resp.headers) === null || _a === void 0 ? void 0 : _a["content-type"]) === null || _b === void 0 ? void 0 : _b.includes("text/html"))) {
            resp.data = cheerio_1.default.load(resp.data);
        }
        return true;
    }
}
exports.CheerioMiddleware = CheerioMiddleware;
