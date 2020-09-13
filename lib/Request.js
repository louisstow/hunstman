"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestState = exports.Request = void 0;
const axios_1 = __importDefault(require("axios"));
const Response_1 = require("./Response");
const proxy_agent_1 = __importDefault(require("proxy-agent"));
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
class Request {
    constructor(url, method = "GET", data = undefined) {
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
    setResponse(resp) {
        const r = new Response_1.Response(this, resp.status, resp.statusText, resp.headers, resp.data, resp.data);
        this.response = r;
        return r;
    }
    createAxiosProps() {
        const httpAgent = this.proxy ? new proxy_agent_1.default(this.proxy) : undefined;
        return {
            url: this.url,
            method: this.method,
            data: this.data,
            headers: this.headers,
            responseType: "text",
            transformResponse: [nop],
            cancelToken: this.cancelToken.token,
            timeout: this.timeout,
            httpsAgent: httpAgent,
            httpAgent: httpAgent,
        };
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.state === RequestState.REQUESTING) {
                throw new Error("Request has already been started");
            }
            this.reset();
            this.state = RequestState.REQUESTING;
            this.startTime = Date.now();
            try {
                const resp = yield axios_1.default(this.createAxiosProps());
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
        });
    }
}
exports.Request = Request;
