import { Spider, SpiderEvents } from "../Spider";
import { Request, RequestState } from "../Request";
import { Response } from "../Response";
import { QueueItem, QueueItemState } from "../Queue";
import { Setting, Settings } from "../Settings";
import { simulateRequest } from "./request.util";

describe("Sync spider", () => {
  test("Basic spider run", async () => {
    const s = new Spider("basic");

    const onDone = jest.fn();
    const onResponse = jest.fn();
    const onReqDone = jest.fn();

    s.on(SpiderEvents.DONE, onDone);
    s.on(SpiderEvents.RESPONSE, onResponse);
    s.on(SpiderEvents.REQUEST_DONE, onReqDone);

    const mockResponse = {
      status: 200,
      statusText: "OK",
      data: "response",
      headers: {},
    };

    const r = simulateRequest(0, mockResponse);
    expect(s.engine.isWaiting()).toBe(true);

    const resp = await s.run(r);
    expect(resp[0].status).toBe(200);

    expect(s.engine.isWaiting()).toBe(true);
    expect(onDone).toHaveBeenCalled();
    expect(onResponse).toHaveBeenCalled();
    expect(onReqDone).toHaveBeenCalled();
  });

  test("Buffering spider", async () => {
    const s = new Spider("buffering");
    const requests: Request[] = [];
    const N = 120;

    for (let i = 0; i < N; ++i) {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        data: `response ${i}`,
        headers: { "X-ID": i },
      };

      const r = simulateRequest(i, mockResponse);
      requests.push(r);
    }

    let response_count = 0;
    s.on(SpiderEvents.REQUEST_DONE, async () => {
      response_count++;
    });

    const resp = await s.run(requests);

    expect(resp.length).toBe(N);
    expect(resp[0].status).toBe(200);
    expect(resp[56].headers["X-ID"]).toBe(56);
    expect(response_count).toBe(N);
  });

  test("Errors and events in spider", async () => {
    const s = new Spider("errors");
    const requests: Request[] = [];
    const N = 10;

    for (let i = 0; i < N; ++i) {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        data: `response ${i}`,
        headers: { "X-ID": `${i}` },
      };

      let r: Request;

      if (i % 2 !== 0) {
        mockResponse.status = 400;
        r = simulateRequest(i, mockResponse, -1, false);
      } else {
        r = simulateRequest(i, mockResponse);
      }

      requests.push(r);
    }

    let err_count = 0;
    let req_count = 0;
    let resp_count = 0;

    s.on(SpiderEvents.ERROR, async (err, item) => {
      err_count++;
      expect(item.state).toBe(QueueItemState.FINISHED);
      expect(err).toBeTruthy();
    });

    s.on(SpiderEvents.REQUEST_DONE, async (item) => {
      req_count++;
      expect(typeof item.index).toBe("number");
      expect(item.state).toBe(QueueItemState.FINISHED);
    });

    s.on(SpiderEvents.RESPONSE, async (resp, item) => {
      resp_count++;
      expect(resp).toBeInstanceOf(Response);
      expect(item.state).toBe(QueueItemState.FINISHED);
    });

    const resp = await s.run(requests);

    expect(resp.length).toBe(N);
    expect(resp[0].status).toBe(200);
    expect(resp[1].status).toBe(400);

    expect(err_count).toBe(5);
    expect(resp_count).toBe(5);

    expect(req_count).toBe(10);
  });

  test("Cancelling spider and reseting", (done) => {
    const requests: Request[] = [];
    const N = 10;

    for (let i = 0; i < N; ++i) {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        data: `response ${i}`,
        headers: { "X-ID": i },
      };

      const r = simulateRequest(i, mockResponse, 100);
      requests.push(r);
    }

    const s = new Spider("cancel", requests);
    const p = s.run();

    let req_count = 0;
    s.on(SpiderEvents.REQUEST_DONE, async (item: QueueItem) => {
      if (item.request.state !== RequestState.CANCELLED) {
        req_count++;
      }
    });

    setTimeout(() => {
      s.cancel();
      expect(s.engine.isCancelled()).toBe(true);
      expect(s.queue.countRemainingItems()).toBe(0);
    }, 10);

    setTimeout(() => {
      expect(req_count).toBe(0);
      s.reset();
      expect(s.engine.isWaiting()).toBe(true);
      done();
    }, 150);
  });
});

describe("Async Spiders", () => {
  test("Pause and resume spider", (done) => {
    const setting = new Settings();
    setting.set(Setting.MAX_CONCURRENT_REQUESTS, 2);

    const s = new Spider("pauseResume", undefined, setting);
    const requests: Request[] = [];
    const N = 5;

    const onDone = jest.fn();
    s.on(SpiderEvents.DONE, onDone);

    for (let i = 0; i < N; ++i) {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        data: `response ${i}`,
        headers: { "X-ID": `${i}` },
      };

      const r = simulateRequest(i, mockResponse, 100);
      requests.push(r);
    }

    const p = s.run(requests);

    // pause after 10ms
    setTimeout(() => {
      s.pause();
      expect(s.queue.countFinishedItems()).toBe(0);
      expect(s.engine.isPaused()).toBe(true);
    }, 10);

    // check that the buffered were completed
    // and no more were dequeue'd
    setTimeout(() => {
      expect(s.queue.countFinishedItems()).toBe(
        setting.get(Setting.MAX_CONCURRENT_REQUESTS)
      );
      expect(s.queue.countRemainingItems()).toBeLessThan(N);
      expect(s.results.length).toBeGreaterThan(1);

      s.resume();
    }, 150);

    p.then((results) => {
      expect(results.length).toBe(N);
      expect(onDone).toHaveBeenCalled();
      done();
    });
  });
});

describe("Long living", () => {
  test("rerun spiders", async () => {
    const s = new Spider("rerun");
    const firstRequests: Request[] = [];
    const secondRequests: Request[] = [];
    const N = 120;

    for (let i = 0; i < N; ++i) {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        data: `response ${i}`,
        headers: { "X-ID": i },
      };

      firstRequests.push(simulateRequest(i, mockResponse));

      if (i % 2 === 0) {
        secondRequests.push(simulateRequest(i, mockResponse));
      }
    }

    const r1 = await s.run(firstRequests);
    expect(r1.length).toBe(N);
    expect(s.engine.isWaiting()).toBe(true);

    const r2 = await s.run(secondRequests);
    expect(r2.length).toBe(N / 2);
    expect(s.engine.isWaiting()).toBe(true);
  });

  test("error and rerun", async () => {
    const s = new Spider("errors");
    const requests: Request[] = [];
    const N = 10;

    for (let i = 0; i < N; ++i) {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        data: `response ${i}`,
        headers: { "X-ID": `${i}` },
      };

      let r: Request;

      if (i % 2 !== 0) {
        mockResponse.status = 400;
        r = simulateRequest(i, mockResponse, -1, false);
      } else {
        r = simulateRequest(i, mockResponse);
      }

      requests.push(r);
    }

    let err_count = 0;
    let resp_count = 0;

    s.on(SpiderEvents.ERROR, async (err, item) => {
      err_count++;
    });

    s.on(SpiderEvents.RESPONSE, async (resp, item) => {
      resp_count++;
      expect(resp).toBeInstanceOf(Response);
      expect(item.state).toBe(QueueItemState.FINISHED);

      throw new Error("Break");
    });

    const resp = await s.run(requests);
    expect(resp.length).toBe(N);
    expect(err_count).toBe(N);

    const newRequest = simulateRequest(
      0,
      {
        status: 200,
        statusText: "OK",
        data: `new response`,
      },
      -1
    );

    const r = await s.run([newRequest]);

    expect(r.length).toBe(1);
  });
});
