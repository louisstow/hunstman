"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogType = exports.Logger = exports.Log = void 0;
var LogType;
(function (LogType) {
    LogType[LogType["DEBUG"] = 0] = "DEBUG";
    LogType[LogType["INFO"] = 1] = "INFO";
    LogType[LogType["WARN"] = 2] = "WARN";
    LogType[LogType["ERROR"] = 3] = "ERROR";
})(LogType || (LogType = {}));
exports.LogType = LogType;
class Logger {
    error(...args) { }
    warn(...args) { }
    info(...args) { }
    debug(...args) { }
}
exports.Logger = Logger;
class ConsoleLogger extends Logger {
    error(...args) {
        console.error(...args);
    }
    warn(...args) {
        console.warn(...args);
    }
    info(...args) {
        console.info(...args);
    }
    debug(...args) {
        console.debug(...args);
    }
}
class Log {
    constructor(prefix, logger) {
        this.prefix = prefix;
        this.logger = logger ?? new ConsoleLogger();
    }
    log(type, ...args) {
        if (type === LogType.ERROR) {
            this.logger.error(this.prefix, ...args);
        }
        else if (type === LogType.WARN) {
            this.logger.warn(this.prefix, ...args);
        }
        else if (type === LogType.INFO) {
            this.logger.info(this.prefix, ...args);
        }
        else {
            this.logger.debug(this.prefix, ...args);
        }
    }
    info(...args) {
        return this.log(LogType.INFO, ...args);
    }
    warn(...args) {
        return this.log(LogType.WARN, ...args);
    }
    error(...args) {
        return this.log(LogType.ERROR, ...args);
    }
    debug(...args) {
        return this.log(LogType.DEBUG, ...args);
    }
}
exports.Log = Log;
