"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestState = exports.Request = void 0;
const axios_1 = __importDefault(require("axios"));
const https_proxy_agent_1 = require("https-proxy-agent");
const events_1 = require("events");
const Response_1 = require("./Response");
const CancelToken = axios_1.default.CancelToken;
const nop = (data) => data;
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
class Request extends events_1.EventEmitter {
    constructor(url, method = "GET", data = undefined) {
        super();
        this.responseType = "text";
        this.proxy = false;
        this.timeout = 0;
        this.error = null;
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
    setResponseType(type) {
        this.responseType = type;
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
    reset() {
        this.startTime = null;
        this.endTime = null;
        this.error = null;
        this.response = null;
        this.state = RequestState.WAITING;
    }
    serialize() {
        return {
            url: this.url,
            headers: { ...this.headers },
            meta: { ...this.meta },
            method: this.method,
            data: this.data,
            responseType: this.responseType,
            response: this.response?.serialize(),
        };
    }
    setResponse(resp) {
        const r = new Response_1.Response(this, resp.request?.res?.responseUrl || this.url, resp.status, resp.statusText, resp.headers, resp.data, resp.data);
        this.response = r;
        return r;
    }
    createAxiosProps() {
        const agent = this.proxy ? new https_proxy_agent_1.HttpsProxyAgent(this.proxy) : undefined;
        return {
            url: this.url,
            method: this.method,
            data: this.data,
            headers: this.headers,
            responseType: this.responseType,
            transformResponse: [nop],
            cancelToken: this.cancelToken.token,
            timeout: this.timeout,
            httpAgent: agent,
            httpsAgent: agent,
        };
    }
    async run() {
        if (this.state === RequestState.REQUESTING) {
            throw new Error("Request has already been started");
        }
        this.reset();
        this.state = RequestState.REQUESTING;
        this.startTime = Date.now();
        try {
            const resp = await (0, axios_1.default)(this.createAxiosProps());
            this.state = RequestState.COMPLETED;
            this.endTime = Date.now();
            return this.setResponse(resp);
        }
        catch (caughtError) {
            const err = caughtError;
            this.state = RequestState.FAILED;
            this.endTime = Date.now();
            this.error = err;
            if (err.response) {
                this.setResponse(err.response);
            }
            throw err;
        }
    }
}
exports.Request = Request;
