import fs from "fs";
import path from "path";
import type { Middleware } from "Middleware";
import type { Logger } from "Log";

enum Setting {
  MAX_CONCURRENT_REQUESTS = "maxConcurrentRequests",
  TIMEOUT = "timeout",
  PROXY = "proxy",
  MIDDLEWARE = "middleware",
  LOGGER = "logger",
  CACHE_PATH = "cachePath",
}

type KnownSettings = Partial<{
  [Setting.MAX_CONCURRENT_REQUESTS]: number;
  [Setting.TIMEOUT]: number;
  [Setting.PROXY]: string;
  [Setting.MIDDLEWARE]: Middleware[];
  [Setting.LOGGER]: Logger;
  [Setting.CACHE_PATH]: string;
}>;

type SpiderSettings = KnownSettings & { [k: string]: any };

type SettingsKey = keyof KnownSettings;

class Settings {
  settings: SpiderSettings = {};

  constructor(settings?: SpiderSettings) {
    if (settings) {
      this.extend(settings);
    }
  }

  loadConfig(configPath?: string): boolean {
    const p = configPath || path.resolve(process.cwd(), "huntsman.config.json");
    let config: SpiderSettings;

    try {
      config = JSON.parse(fs.readFileSync(p).toString());
      this.extend(config);
    } catch (err) {
      console.warn(
        `Unable to read huntsman.config.json in working directory (${p})`
      );

      return false;
    }

    return true;
  }

  get<T extends any>(setting: SettingsKey | string, fallback?: T): T {
    return setting in this.settings ? this.settings[setting] : fallback;
  }

  set(setting: SettingsKey | string, value: any) {
    this.settings[setting] = value;
  }

  extend(settings: SpiderSettings | Settings) {
    if (settings instanceof Settings) {
      settings = settings.settings;
    }

    for (const key in settings) {
      this.set(key, settings[key]);
    }
  }
}

export { Settings, SpiderSettings, Setting };
