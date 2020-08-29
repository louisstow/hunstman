import { Spider } from "../src/Spider";
import { Logger } from "../src/Log";

let out: string = "";

class TestLogger extends Logger {
  debug(...args: any[]) {
    out = args.join(",");
  }

  error(...args: any[]) {
    out = args.join(",");
  }

  warn(...args: any[]) {
    out = args.join(",");
  }

  info(...args: any[]) {
    out = args.join(",");
  }
}

test("Test logger", () => {
  const logger = new TestLogger();
  const s = new Spider("test", undefined, undefined, logger);

  s.logger.debug("debug");
  expect(out).toBe("[test],debug");

  s.logger.error("error");
  expect(out).toBe("[test],error");

  s.logger.warn("warn");
  expect(out).toBe("[test],warn");

  s.logger.info("info");
  expect(out).toBe("[test],info");
});
