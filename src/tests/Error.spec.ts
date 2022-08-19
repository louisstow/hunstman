import { Spider, SpiderState, SpiderEvents } from "../Spider";
import { simulateRequest } from "./request.util";

describe("Error handling", () => {
  test("can handle single error from response", async () => {
    const spider = new Spider("error");
    spider.on(SpiderEvents.RESPONSE, async () => {
      throw new Error("test");
    });

    spider.on(SpiderEvents.ERROR, async (err) => {
      throw err;
    });

    const r = simulateRequest(0, {}, 100);

    let foundError = null;
    try {
      await spider.run(r);
    } catch (err) {
      foundError = err;
    }

    console.log(foundError);
    expect(foundError).toBeTruthy();
  });

  test.only("can handle single error from response", async () => {
    const spider = new Spider("error");
    spider.on(SpiderEvents.RESPONSE, async () => {
      throw new Error("test");
    });

    spider.on(SpiderEvents.ERROR, async (err) => {
      throw err;
    });

    const r = [simulateRequest(0, {}, 100), simulateRequest(1, {}, 100)];

    let foundError = null;
    try {
      await spider.run(r);
    } catch (err) {
      foundError = err;
    }

    console.log(foundError);
    expect(foundError).toBeTruthy();
  });
});
