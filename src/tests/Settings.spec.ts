import { Settings } from "../Settings";

jest.mock("fs");

test("Basic settings functions", () => {
  const s = new Settings();
  s.set("TEST", 42);

  expect(s.get("TEST")).toBe(42);

  s.extend({ KEY: "hello" });
  expect(s.get("KEY")).toBe("hello");
});

test("Global settings", () => {
  global.HUNTSMAN_SETTINGS = { GLOBAL: 56 };
  const s = new Settings();
  expect(s.get("GLOBAL")).toBe(56);
});

test("Reading config file", () => {
  const s = new Settings();
  s.loadConfig("myfile");

  expect(s.get("LOCALFILE")).toBe(99);
});
