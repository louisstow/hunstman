import { Settings } from "../src/Settings";
import fs from "fs";

jest.mock("fs");

test("Basic settings functions", () => {
  const s = new Settings();
  s.set("TEST", 42);

  expect(s.get("TEST")).toBe(42);

  s.extend({ KEY: "hello" });
  expect(s.get("KEY")).toBe("hello");
});

test("Global settings", () => {
  global.HUNSTMAN_SETTINGS = { GLOBAL: 56 };
  const s = new Settings();
  expect(s.get("GLOBAL")).toBe(56);
});

test("Reading config file", () => {
  fs.readFileSync = jest.fn().mockReturnValue(`{"LOCALFILE": 99}`);
  const s = new Settings();
  s.loadConfig();

  expect(s.get("LOCALFILE")).toBe(99);
});
