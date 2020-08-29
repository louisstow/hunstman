"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Settings = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class Settings {
    constructor() {
        this.settings = {};
        if (global.HUNSTMAN_SETTINGS) {
            this.extend(global.HUNSTMAN_SETTINGS);
        }
    }
    loadConfig(configPath) {
        const p = configPath || path_1.default.resolve(process.cwd(), "hunstman.config.json");
        let config;
        try {
            config = JSON.parse(fs_1.default.readFileSync(p).toString());
        }
        catch (err) {
            console.log(`Unable to read huntsman.config.json in working directory (${p})`);
            return false;
        }
        this.extend(config);
        return true;
    }
    get(setting, fallback = undefined) {
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
