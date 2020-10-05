"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugMiddleware = void 0;
const Middleware_1 = require("../Middleware");
class DebugMiddleware extends Middleware_1.Middleware {
    processRequest(r, spider) {
        spider.logger.debug(`Requesting ${r.url}`);
        return Promise.resolve(r);
    }
    processResponse(item, spider) {
        const req = item.request;
        const resp = req.response;
        let status = "UNK";
        if (resp) {
            status = String(resp.status);
        }
        else if (req.error && req.error.code) {
            status = req.error.code;
        }
        else if (req.error && req.error.message) {
            status = req.error.message;
        }
        else if (req.error && req.error.name) {
            status = req.error.name;
        }
        else if (req.error) {
            status = "ERR";
            spider.logger.error(req.error);
        }
        spider.logger.debug(`<${status}> from ${item.request.url}`);
        return Promise.resolve(true);
    }
}
exports.DebugMiddleware = DebugMiddleware;
