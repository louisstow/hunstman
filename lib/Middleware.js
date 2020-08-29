"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Middleware = void 0;
class Middleware {
    processRequest(r) {
        return Promise.resolve(r);
    }
    processResponse(item, spider) {
        return true;
    }
}
exports.Middleware = Middleware;
const dedupe = {};
class DelayMiddleware extends Middleware {
    processRequest(r) {
        return new Promise((resolve) => {
            setTimeout(() => resolve(r), 100);
        });
    }
}
class DedupeMiddleware extends Middleware {
    constructor() {
        super();
        this.dedupe = {};
    }
    processRequest(r) {
        if (this.dedupe[r.url]) {
            return Promise.reject();
        }
        this.dedupe[r.url] = true;
        return Promise.resolve(r);
    }
}
class RetryMiddleware extends Middleware {
    processResponse(item) {
        // probably shouldnt be non-200
        if (item.request.response && item.request.response.status !== 200) {
            item.free = true;
        }
        return false;
    }
}
class JSONMiddleware extends Middleware {
    processResponse(item) {
        // probably shouldnt be non-200
        if (item.request.response && item.request.response.status === 200) {
            item.request.response.data = JSON.parse(item.request.response.data);
        }
        return true;
    }
}
