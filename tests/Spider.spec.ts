import { Spider, SpiderState, SpiderEvents } from "../src/Spider";
import { RequestState } from "../src/Request";
import { QueueItem } from "../src/Queue";
import { Settings } from "../src/Settings";
import { simulateRequest } from "./request.util";

test("Basic spider run", async () => {
  const s = new Spider("basic");

  const mockResponse = {
    status: 200,
    statusText: "OK",
    data: "response",
    headers: {},
  };

  const r = simulateRequest(0, mockResponse);
  expect(s.state).toBe(SpiderState.IDLE);

  const resp = await s.run(r);
  expect(resp[0].status).toBe(200);
  expect(r.run).toHaveBeenCalled();

  expect(s.state).toBe(SpiderState.DONE);
});

test("Buffering spider", async () => {
  const s = new Spider("buffering");
  const requests = [];
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
  s.on(SpiderEvents.REQUEST_DONE, () => {
    response_count++;
  });

  const resp = await s.run(requests);

  expect(resp.length).toBe(N);
  expect(resp[0].status).toBe(200);
  expect(resp[56].headers["X-ID"]).toBe(56);
  expect(response_count).toBe(N);
});

test("Pause and resume spider", (done) => {
  const setting = new Settings();
  setting.set("maxRequests", 50);

  const s = new Spider("pauseResume", undefined, setting);
  const requests = [];
  const N = 120;

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
    expect(s.queue.done()).toBe(0);
    expect(s.state).toBe(SpiderState.PAUSED);
  }, 10);

  // check that the buffered were completed
  // and no more were dequeue'd
  setTimeout(() => {
    expect(s.queue.done()).toBe(setting.get("maxRequests"));
    expect(s.queue.free()).toBeLessThan(N);
    expect(s.results.length).toBeGreaterThan(1);

    s.resume();
  }, 150);

  p.then((results) => {
    expect(results.length).toBe(N);
    done();
  });
});

test("Errors and events in spider", async () => {
  const s = new Spider("errors");
  const requests = [];
  const N = 10;

  for (let i = 0; i < N; ++i) {
    const mockResponse = {
      status: 200,
      statusText: "OK",
      data: `response ${i}`,
      headers: { "X-ID": `${i}` },
    };

    let r;

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
  s.on(SpiderEvents.ERROR, () => {
    err_count++;
  });

  s.on(SpiderEvents.REQUEST_DONE, () => {
    req_count++;
  });

  s.on(SpiderEvents.RESPONSE, () => {
    resp_count++;
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
  const requests = [];
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
  s.on(SpiderEvents.REQUEST_DONE, (item: QueueItem) => {
    if (item.request.state !== RequestState.CANCELLED) {
      req_count++;
    }
  });

  setTimeout(() => {
    s.cancel();
    expect(s.state).toBe(SpiderState.CANCELLED);
    expect(s.queue.free()).toBe(N);
  }, 10);

  setTimeout(() => {
    expect(req_count).toBe(0);
    s.reset();
    expect(s.state).toBe(SpiderState.IDLE);
    done();
  }, 150);
});
