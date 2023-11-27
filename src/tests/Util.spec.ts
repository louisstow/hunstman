import { Spider, SpiderEvents } from "../Spider";
import { simulateRequest } from "./request.util";
import { Request } from "../Request";

import { cache } from "../utils";
import { Setting } from "../Settings";

describe("Cache", () => {
  test("Can run through a cache", async () => {
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

    const resp = await cache(s).run(r);

    expect(onResponse.mock.invocationCallOrder[0]).toBeLessThan(
      onDone.mock.invocationCallOrder[0]
    );
  });
});
