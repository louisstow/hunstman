jest.mock("proxy-agent");
jest.mock("axios");

import { Request, RequestState } from "../Request";
import { Response } from "../Response";

test("Basic request functions", () => {
  const r = new Request("test");
  expect(r.method).toBe("GET");

  r.setHeader("User-Agent", "Mozilla");
  expect(r.headers["User-Agent"]).toBe("Mozilla");

  r.setMeta("randomKey", 42);
  expect(r.getMeta("randomKey")).toBe(42);

  expect(r.state).toBe(RequestState.WAITING);

  r.cancel();
  expect(r.state).toBe(RequestState.CANCELLED);

  expect(JSON.stringify(r.serialize())).toBe(
    '{"url":"test","headers":{"User-Agent":"Mozilla"},"meta":{"randomKey":42},"method":"GET"}'
  );

  r.reset();
  expect(r.state).toBe(RequestState.WAITING);
});

test("Requesting state", async () => {
  const axios = require("axios");

  const url = "https://awebsiteurl.tld/";
  const r = new Request(url);
  axios.__setMockedRepsonse(
    new Promise((resolve) =>
      setTimeout(
        () => resolve(new Response(r, url, 200, "OK", {}, "", "")),
        200
      )
    )
  );

  expect(r.duration()).toBe(null);

  const resp = await r.run();
  expect(resp.status).toBe(200);
  expect(r.duration()).toBeGreaterThan(0);

  r.run();
  try {
    await r.run();
  } catch (err) {
    expect(err instanceof Error).toBe(true);
  }

  r.reset();
  r.setTimeout(400);
  r.setProxy("http://localhost:8118");

  expect(r.timeout).toBe(400);
  expect(r.proxy).toBe("http://localhost:8118");

  const url2 = "https://websitewith404response.tld/nopathfoundhere";
  const r2 = new Request(url2);
  axios.__setMockedRepsonse(
    Promise.reject({
      response: new Response(r2, url2, 404, "Not Found", {}, "", ""),
    })
  );

  try {
    await r2.run();
  } catch (err) {
    expect(r2.response?.status).toBe(404);
  }
});

test("Options", async () => {
  require("axios").__setReflectOptions(true);

  const r = new Request("url", "POST", { a: 1 });

  r.setTimeout(20);
  r.setProxy("http://locahost:8080");

  const out = await r.run();

  expect(out.data.url).toBe("url");
  expect(out.data.method).toBe("POST");
  expect(out.data.timeout).toBe(20);
  expect(out.data.httpAgent.__name).toBe("proxy-agent");
});
