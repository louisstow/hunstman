enum LogType {
  DEBUG,
  INFO,
  WARN,
  ERROR,
}

class Logger {
  prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  error(...args: any[]) {}
  warn(...args: any[]) {}
  info(...args: any[]) {}
  debug(...args: any[]) {}
}

class ConsoleLogger extends Logger {
  error(...args: any[]) {
    console.error(this.prefix, ...args);
  }
  warn(...args: any[]) {
    console.warn(this.prefix, ...args);
  }
  info(...args: any[]) {
    console.info(this.prefix, ...args);
  }
  debug(...args: any[]) {
    console.debug(this.prefix, ...args);
  }
}

export { ConsoleLogger, Logger, LogType };
