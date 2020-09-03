"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestState = exports.Request = void 0;
const axios_1 = __importDefault(require("axios"));
const Response_1 = require("./Response");
const proxy_agent_1 = __importDefault(require("proxy-agent"));
const CancelToken = axios_1.default.CancelToken;
var RequestState;
(function (RequestState) {
    RequestState[RequestState["WAITING"] = 0] = "WAITING";
    RequestState[RequestState["REQUESTING"] = 1] = "REQUESTING";
    RequestState[RequestState["CANCELLED"] = 2] = "CANCELLED";
    RequestState[RequestState["COMPLETED"] = 3] = "COMPLETED";
    RequestState[RequestState["FAILED"] = 4] = "FAILED";
    RequestState[RequestState["SKIPPED"] = 5] = "SKIPPED";
})(RequestState || (RequestState = {}));
exports.RequestState = RequestState;
class Request {
    constructor(url, method = "GET", data = undefined) {
        this.proxy = false;
        this.timeout = 0;
        this.url = url;
        this.meta = {};
        this.headers = {};
        this.state = RequestState.WAITING;
        this.method = method;
        this.data = data;
        this.cancelToken = CancelToken.source();
        this.response = null;
        this.startTime = null;
        this.endTime = null;
    }
    setMeta(key, value) {
        this.meta[key] = value;
    }
    getMeta(key) {
        return this.meta[key];
    }
    setHeader(key, value) {
        this.headers[key] = value;
    }
    setProxy(proxy) {
        this.proxy = proxy;
    }
    setTimeout(ms) {
        this.timeout = ms;
    }
    cancel() {
        this.state = RequestState.CANCELLED;
        this.cancelToken.cancel();
    }
    duration() {
        if (this.startTime && this.endTime) {
            return this.endTime - this.startTime;
        }
        return null;
    }
    serialize() {
        var _a;
        return {
            url: this.url,
            headers: Object.assign({}, this.headers),
            meta: Object.assign({}, this.meta),
            method: this.method,
            data: this.data,
            response: (_a = this.response) === null || _a === void 0 ? void 0 : _a.serialize(),
        };
    }
    run() {
        if (this.state === RequestState.REQUESTING) {
            throw new Error("Request has already been started");
        }
        this.state = RequestState.REQUESTING;
        this.startTime = Date.now();
        let httpAgent = undefined;
        if (this.proxy) {
            httpAgent = new proxy_agent_1.default(this.proxy);
        }
        return new Promise((resolve, reject) => {
            axios_1.default({
                url: this.url,
                method: this.method,
                data: this.data,
                headers: this.headers,
                responseType: "text",
                transformResponse: [
                    (data) => {
                        return data;
                    },
                ],
                cancelToken: this.cancelToken.token,
                timeout: this.timeout,
                httpsAgent: httpAgent,
                httpAgent: httpAgent,
            })
                .then((resp) => {
                this.state = RequestState.COMPLETED;
                this.endTime = Date.now();
                const r = new Response_1.Response(this, resp.status, resp.statusText, resp.headers, resp.data, resp.data);
                this.response = r;
                resolve(r);
            })
                .catch((err) => {
                this.state = RequestState.FAILED;
                this.endTime = Date.now();
                if (err.response) {
                    const r = new Response_1.Response(this, err.response.status, err.response.statusText, err.response.headers, err.response.data, err.response.data);
                    this.response = r;
                }
                reject(err);
            });
        });
    }
}
exports.Request = Request;
