declare enum LogType {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}
declare class Logger {
    error(...args: any[]): void;
    warn(...args: any[]): void;
    info(...args: any[]): void;
    debug(...args: any[]): void;
}
declare class Log {
    prefix: string;
    logger: Logger;
    constructor(prefix: string, logger?: Logger);
    log(type: LogType, ...args: any[]): void;
    info(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
    debug(...args: any[]): void;
}
export { Log, Logger, LogType };
