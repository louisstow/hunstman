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
        const resp = item.request.response;
        if (resp && item.request.headers["content-type"].includes("text/html")) {
            const $ = cheerio_1.default.load(resp.data);
            resp.data = $;
        }
        return true;
    }
}
exports.CheerioMiddleware = CheerioMiddleware;
