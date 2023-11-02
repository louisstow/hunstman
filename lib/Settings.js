"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Setting = exports.Settings = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
var Setting;
(function (Setting) {
    Setting["MAX_CONCURRENT_REQUESTS"] = "maxConcurrentRequests";
    Setting["TIMEOUT"] = "timeout";
    Setting["PROXY"] = "proxy";
    Setting["MIDDLEWARE"] = "middleware";
    Setting["LOGGER"] = "logger";
})(Setting || (Setting = {}));
exports.Setting = Setting;
class Settings {
    constructor(settings) {
        this.settings = {};
        if (settings) {
            this.extend(settings);
        }
    }
    loadConfig(configPath) {
        const p = configPath || path_1.default.resolve(process.cwd(), "huntsman.config.json");
        let config;
        try {
            config = JSON.parse(fs_1.default.readFileSync(p).toString());
            this.extend(config);
        }
        catch (err) {
            console.warn(`Unable to read huntsman.config.json in working directory (${p})`);
            return false;
        }
        return true;
    }
    get(setting, fallback) {
        return setting in this.settings ? this.settings[setting] : fallback;
    }
    set(setting, value) {
        this.settings[setting] = value;
    }
    extend(settings) {
        for (const key in settings) {
            this.set(key, settings[key]);
        }
    }
}
exports.Settings = Settings;
