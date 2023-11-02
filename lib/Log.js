"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogType = exports.Logger = exports.ConsoleLogger = void 0;
var LogType;
(function (LogType) {
    LogType[LogType["DEBUG"] = 0] = "DEBUG";
    LogType[LogType["INFO"] = 1] = "INFO";
    LogType[LogType["WARN"] = 2] = "WARN";
    LogType[LogType["ERROR"] = 3] = "ERROR";
})(LogType || (LogType = {}));
exports.LogType = LogType;
class Logger {
    constructor(prefix) {
        this.prefix = prefix;
    }
    error(...args) { }
    warn(...args) { }
    info(...args) { }
    debug(...args) { }
}
exports.Logger = Logger;
class ConsoleLogger extends Logger {
    error(...args) {
        console.error(this.prefix, ...args);
    }
    warn(...args) {
        console.warn(this.prefix, ...args);
    }
    info(...args) {
        console.info(this.prefix, ...args);
    }
    debug(...args) {
        console.debug(this.prefix, ...args);
    }
}
exports.ConsoleLogger = ConsoleLogger;
