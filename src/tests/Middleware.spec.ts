import { Spider, SpiderEvents } from "../Spider";
import { Request } from "../Request";
import { QueueItem, QueueItemState } from "../Queue";
import { Middleware } from "../Middleware";
import { Response } from "../Response";

import { simulateRequest } from "./request.util";

describe("Middleware", () => {
  test("Process request middleware", (done) => {
    const requests: Request[] = [];
    const N = 10;
    const UA = "Mozilla";

    const uaMiddleware = new Middleware();
    uaMiddleware.processRequest = jest.fn().mockImplementation((r) => {
      r.headers["User-Agent"] = UA;
      return Promise.resolve(r);
    });

    const slowMiddleware = new Middleware();
    slowMiddleware.processRequest = jest.fn().mockImplementation((r) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(r);
        }, 200);
      });
    });

    const skipMiddleware = new Middleware();
    skipMiddleware.processRequest = jest
      .fn()
      .mockImplementation((r: Request) => {
        return new Promise((resolve) => {
          if (r.url === "n:1") resolve(null);
          else resolve(r);
        });
      });

    for (let i = 0; i < N; ++i) {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        data: `response ${i}`,
        headers: { "X-ID": `${i}` },
      };

      const r = simulateRequest(i, mockResponse, 200);
      requests.push(r);
    }

    const s = new Spider("middlewareRequests", requests);
    s.addMiddleware(uaMiddleware);
    s.addMiddleware(slowMiddleware);
    s.addMiddleware(skipMiddleware);

    const start = Date.now();
    const p = s.run();

    let req_count = 0;

    s.on(SpiderEvents.REQUEST_DONE, async (item: QueueItem) => {
      expect(item.request.headers["User-Agent"]).toBe(UA);
      const deltaTime = Date.now() - start;
      expect(deltaTime).toBeGreaterThanOrEqual(200);

      req_count++;
    });

    s.on(SpiderEvents.SKIP, async (item: QueueItem) => {
      expect(item.request.url).toBe("n:1");
    });

    p.then(() => {
      expect(req_count).toBe(N - 1);
      done();
    });
  });

  test("Process response middleware", (done) => {
    const requests: Request[] = [];
    const N = 4;

    const jsonMiddleware = new Middleware();

    jsonMiddleware.processResponse = jest
      .fn()
      .mockImplementation((item: QueueItem) => {
        if (item.request.response) {
          item.request.response.data = JSON.parse(item.request.response.data);
        }
        return Promise.resolve(true);
      });

    const retryMiddleware = new Middleware();
    let maxRetry = 4;
    let retryCounter = 0;
    retryMiddleware.processResponse = jest
      .fn()
      .mockImplementation((item: QueueItem, spider: Spider) => {
        if (item.request.url == "n:1" && retryCounter < maxRetry) {
          retryCounter++;
          item.state = QueueItemState.READY;
          return Promise.resolve(false);
        }
        return Promise.resolve(true);
      });

    for (let i = 0; i < N; ++i) {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        data: `{"id": ${i}}`,
        headers: { "X-ID": `${i}` },
      };

      const r = simulateRequest(i, mockResponse, 100);

      requests.push(r);
    }

    const s = new Spider("middlewareResponse", requests);
    s.addMiddleware(jsonMiddleware);
    s.addMiddleware(retryMiddleware);

    const p = s.run();
    let req_count = 0;

    s.on(SpiderEvents.RESPONSE, async (out: Response) => {
      expect(typeof out.data.id).toBe("number");
      req_count++;
    });

    p.then(() => {
      expect(req_count).toBe(N);
      expect(retryCounter).toBe(maxRetry);
      done();
    });
  });
});

describe("Default middleware", () => {
  test("Set default middleware", async () => {
    const testMiddleware = new Middleware();

    let processed = false;
    testMiddleware.processRequest = jest.fn().mockImplementation((r) => {
      processed = true;
      return Promise.resolve(r);
    });

    Spider.setDefaultMiddleware([testMiddleware]);

    const s = new Spider("defaultMiddleware");
    expect(s.middleware.length).toBe(1);

    const r = simulateRequest(0, {}, 0);
    await s.run(r);

    expect(processed).toBe(true);

    Spider.setDefaultMiddleware([]);
  });
});
