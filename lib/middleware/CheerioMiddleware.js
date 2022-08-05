"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheerioMiddleware = void 0;
const Middleware_1 = require("../Middleware");
const cheerio_1 = __importDefault(require("cheerio"));
class CheerioMiddleware extends Middleware_1.Middleware {
    constructor(options = { isXML: false }) {
        super();
        this.isXML = false;
        this.isXML = options.isXML || false;
    }
    processResponse(item) {
        const resp = item.request.response;
        if (resp) {
            resp.data = cheerio_1.default.load(resp.raw, {
                xmlMode: this.isXML,
            });
        }
        return Promise.resolve(true);
    }
}
exports.CheerioMiddleware = CheerioMiddleware;
