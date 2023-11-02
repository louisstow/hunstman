"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAgentMiddleware = void 0;
const Middleware_1 = require("../Middleware");
const topAgents = [
    "Mozilla/5.0 CK={} (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36",
    "Mozilla/5.0 (Windows NT 5.1; rv:7.0.1) Gecko/20100101 Firefox/7.0.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:103.0) Gecko/20100101 Firefox/103.0",
    "Mozilla/5.0 (X11; Linux x86_64; rv:103.0) Gecko/20100101 Firefox/103.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.81 Safari/537.36 Edg/104.0.1293.47",
];
class UserAgentMiddleware extends Middleware_1.Middleware {
    constructor(strategy = "random", agentList) {
        super();
        this.index = 0;
        this.stickyCache = {};
        this.strategy = strategy;
        if (agentList) {
            this.agentList = agentList;
        }
        else {
            this.agentList = topAgents;
        }
    }
    randomPick() {
        return this.agentList[(this.agentList.length * Math.random()) | 0];
    }
    pick(r) {
        if (this.strategy === "sticky") {
            if (this.stickyCache[r.url]) {
                return this.stickyCache[r.url];
            }
            else {
                const ua = this.randomPick();
                this.stickyCache[r.url] = ua;
                return ua;
            }
        }
        else if (this.strategy === "rotate") {
            return this.agentList[this.index++];
        }
        return this.randomPick();
    }
    processRequest(r) {
        if (r) {
            r.setHeader("User-Agent", this.pick(r));
        }
        return Promise.resolve(r);
    }
}
exports.UserAgentMiddleware = UserAgentMiddleware;
