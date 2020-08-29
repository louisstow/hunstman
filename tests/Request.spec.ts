import { Request, RequestState } from "../src/Request";

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
});

test("Requesting state", async () => {
  const r = new Request("https://secalerts.co/");
  const resp = await r.run();
  expect(resp.status).toBe(200);
  expect(r.duration()).toBeGreaterThan(0);

  const r2 = new Request("https://secalerts.co/nopathfoundhere");

  try {
    await r2.run();
  } catch (err) {
    expect(err.status).toBe(404);
  }
});
