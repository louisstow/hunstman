import { Settings } from "../Settings";
import { Spider } from "../Spider";

jest.mock("fs");

describe("Settings", () => {
  test("Basic settings functions", () => {
    const s = new Settings();
    s.set("TEST", 42);

    expect(s.get("TEST")).toBe(42);

    s.extend({ KEY: "hello" });
    expect(s.get("KEY")).toBe("hello");
  });

  test("Local settings", () => {
    const s = new Settings({ local: 56 });
    expect(s.get("local")).toBe(56);
  });

  test("Reading config file", () => {
    const s = new Settings();
    s.loadConfig("myfile");

    expect(s.get("LOCALFILE")).toBe(99);
  });
});

describe("Default settings", () => {
  test("Default settings are inherited", () => {
    Spider.setDefaultSetting("DEFAULT", "set");
    const s = new Spider("test");
    expect(s.settings.get("DEFAULT")).toBe("set");
  });
});
