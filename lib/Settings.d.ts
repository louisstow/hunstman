import type { Middleware } from "Middleware";
import type { Logger } from "Log";
declare enum Setting {
    MAX_CONCURRENT_REQUESTS = "maxConcurrentRequests",
    TIMEOUT = "timeout",
    PROXY = "proxy",
    MIDDLEWARE = "middleware",
    LOGGER = "logger",
    CACHE_PATH = "cachePath"
}
type KnownSettings = Partial<{
    [Setting.MAX_CONCURRENT_REQUESTS]: number;
    [Setting.TIMEOUT]: number;
    [Setting.PROXY]: string;
    [Setting.MIDDLEWARE]: Middleware[];
    [Setting.LOGGER]: Logger;
    [Setting.CACHE_PATH]: string;
}>;
type SpiderSettings = KnownSettings & {
    [k: string]: any;
};
type SettingsKey = keyof KnownSettings;
declare class Settings {
    settings: SpiderSettings;
    constructor(settings?: SpiderSettings);
    loadConfig(configPath?: string): boolean;
    get<T extends any>(setting: SettingsKey | string, fallback?: T): T;
    set(setting: SettingsKey | string, value: any): void;
    extend(settings: SpiderSettings): void;
}
export { Settings, SpiderSettings, Setting };
