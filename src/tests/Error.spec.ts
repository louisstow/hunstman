import { CrawlError, ResponseError } from "../Error";
import { Spider, SpiderEvents } from "../Spider";
import { simulateRequest } from "./request.util";

describe("Error handling", () => {
  test("can handle single error from response", async () => {
    const spider = new Spider("error");
    let errors = 0;

    spider.on(SpiderEvents.RESPONSE, async () => {
      throw new Error("response has bug");
    });

    spider.on(SpiderEvents.ERROR, async (err: ResponseError) => {
      errors++;
      expect(err).toBeInstanceOf(ResponseError);
      expect(err.status).toBe(200);
    });

    const r = [
      simulateRequest(0, { status: 200 }, 100),
      simulateRequest(1, { status: 200 }, 100),
    ];

    await spider.run(r);

    expect(errors).toBe(2);
  });

  test("can handle error from response and error", async () => {
    const spider = new Spider("error");
    let errors = 0;

    spider.on(SpiderEvents.RESPONSE, async () => {
      throw new Error("response has bug");
    });

    spider.on(SpiderEvents.ERROR, async (err) => {
      errors++;
      throw "errorhandler has bug";
    });

    const r = [simulateRequest(0, {}, 100), simulateRequest(1, {}, 100)];

    await spider.run(r);

    expect(errors).toBe(2);
    expect(spider.handlerErrors.length).toBe(2);
    expect(spider.handlerErrors[0].event).toBe(SpiderEvents.ERROR);
  });

  test("can handle error from response and request", async () => {
    const spider = new Spider("error");

    let errors = 0;

    spider.on(SpiderEvents.ERROR, async (err: CrawlError) => {
      errors++;
      expect(err).toBeInstanceOf(CrawlError);
      expect(err.request.url).toBe("n:1");
    });

    const r = [
      simulateRequest(0, { status: 200 }, 100),
      simulateRequest(1, { status: 400 }, 100, false),
    ];

    await spider.run(r);

    expect(errors).toBe(1);
  });
});
