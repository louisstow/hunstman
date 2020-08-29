enum LogType {
  DEBUG,
  INFO,
  WARN,
  ERROR,
}

class Logger {
  error(...args: any[]) {}
  warn(...args: any[]) {}
  info(...args: any[]) {}
  debug(...args: any[]) {}
}

class ConsoleLogger extends Logger {
  error(...args: any[]) {
    console.error(...args);
  }
  warn(...args: any[]) {
    console.warn(...args);
  }
  info(...args: any[]) {
    console.info(...args);
  }
  debug(...args: any[]) {
    console.debug(...args);
  }
}

class Log {
  prefix: string;
  logger: Logger;

  constructor(prefix: string, logger?: Logger) {
    this.prefix = prefix;
    this.logger = logger ?? new ConsoleLogger();
  }

  log(type: LogType, ...args: any[]) {
    if (type === LogType.ERROR) {
      this.logger.error(this.prefix, ...args);
    } else if (type === LogType.WARN) {
      this.logger.warn(this.prefix, ...args);
    } else if (type === LogType.INFO) {
      this.logger.info(this.prefix, ...args);
    } else {
      this.logger.debug(this.prefix, ...args);
    }
  }

  info(...args: any[]) {
    return this.log(LogType.INFO, ...args);
  }

  warn(...args: any[]) {
    return this.log(LogType.WARN, ...args);
  }

  error(...args: any[]) {
    return this.log(LogType.ERROR, ...args);
  }

  debug(...args: any[]) {
    return this.log(LogType.DEBUG, ...args);
  }
}

export { Log, Logger, LogType };
