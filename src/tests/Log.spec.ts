import { Spider } from "../Spider";
import { Logger } from "../Log";

describe("Logger", () => {
  let out: string = "";

  class TestLogger extends Logger {
    debug(...args: any[]) {
      out = this.prefix + args.join(",");
    }

    error(...args: any[]) {
      out = this.prefix + args.join(",");
    }

    warn(...args: any[]) {
      out = this.prefix + args.join(",");
    }

    info(...args: any[]) {
      out = this.prefix + args.join(",");
    }
  }

  test("Test logger", () => {
    const logger = new TestLogger("[testlog] ");
    const s = new Spider("test", undefined, undefined, logger);

    s.logger.debug("debug");
    expect(out).toBe("[testlog] debug");

    s.logger.error("error");
    expect(out).toBe("[testlog] error");

    s.logger.warn("warn");
    expect(out).toBe("[testlog] warn");

    s.logger.info("info");
    expect(out).toBe("[testlog] info");
  });
});
