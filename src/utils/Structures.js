"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
// External libs
const fs_1 = __importDefault(require("fs"));
/**
 * @constructor
 * The class where the `config.json` content and path are stored
 */
class Config {
    /**
     * Configuration object
     */
    config = { server: { domain: 'localhost', port: 80, rootDir: 'stock', socketTimeout: 300000, keepAliveTimeout: 10000, requestTimeout: 30000, headersTimeout: 10000, signatureExpiry: 86400 }, filesPerPage: 30, maxFilesPerDay: 5000, categories: [] };
    /**
     * Configiration file path
     */
    configFilePath = null;
    /**
     * @param configFilePath Config file path
     */
    constructor(configFilePath) {
        try {
            const config = JSON.parse(fs_1.default.readFileSync(configFilePath, 'utf8'));
            if (config) {
                this.config = config;
                this.configFilePath = configFilePath;
            }
            else {
                throw new Error('Invalid config file');
            }
        }
        catch (err) {
            console.log(err);
        }
    }
    /**
     * Refreshes the `config` object, re-reading the `config.json` file
     * @function
     * @returns {boolean} Whether the reload was successful or not
     */
    reload() {
        try {
            const config = JSON.parse(fs_1.default.readFileSync(this.configFilePath, 'utf8'));
            if (config) {
                this.config = config;
                return true;
            }
            else {
                throw new Error('Invalid config file');
            }
        }
        catch (err) {
            console.log(err);
        }
        return false;
    }
    /**
     * Rewrites the `config.json` from the stored `config` object or the a `newConfig` object (if defined)
     * @function
     * @param newConfig A `ConfigObject` from where to rewrite the config file
     * @returns {boolean} Whether the write task was successful or not
     */
    rewrite(newConfig) {
        try {
            if (newConfig) {
                fs_1.default.writeFileSync(this.configFilePath, JSON.stringify(newConfig, null, "\t"), 'utf8');
                this.config = newConfig;
                return true;
            }
            else {
                fs_1.default.writeFileSync(this.configFilePath, JSON.stringify(this.config, null, "\t"), 'utf8');
                return true;
            }
        }
        catch (err) {
            console.log(err);
        }
        return false;
    }
}
exports.Config = Config;
