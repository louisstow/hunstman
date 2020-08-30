declare type SettingsKeyVal = {
    [k: string]: any;
};
declare global {
    namespace NodeJS {
        interface Global {
            HUNSTMAN_SETTINGS: SettingsKeyVal;
        }
    }
}
declare class Settings {
    settings: SettingsKeyVal;
    constructor();
    loadConfig(configPath?: string): boolean;
    get(setting: string, fallback?: any): any;
    set(setting: string, value: any): void;
    extend(settings: SettingsKeyVal): void;
}
export { Settings };
