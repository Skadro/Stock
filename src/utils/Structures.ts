// External libs
import fs from 'fs';
import { Express } from 'express';
import http from 'http';
import https from 'https';

/**
 * The server configuration
 * @interface
 */
export interface ServerConfig {
    domain: string;
    port: number;
    rootDir: string;
    socketTimeout: number;
    keepAliveTimeout: number;
    requestTimeout: number;
    headersTimeout: number;
    signatureExpiry: number;
}

/**
 * The object model from the `config.json` file
 * @interface
 */
export interface ConfigObject {
    server: ServerConfig;
    filesPerPage: number;
    maxFilesPerDay: number;
    categories: string[];
}

/**
 * The object model for storing the server's instances
 * @interface
 */
export interface Server {
    /**
     * The Express app
     */
    app: Express | undefined;

    /**
     * The server instance
     */
    server: http.Server | https.Server | undefined;
}

/**
 * The encrypted signature object model for file serving
 * @interface
 */
export interface EncryptedSignature {
    /**
     * The initialization vector
     */
    iv: string;

    /**
     * The encrypted signature
     */
    signature: string
}

/**
 * Formatted date model
 * @interface
 */
export interface FormattedDate {
    year: string;
    month: string;
    day: string;
}

/**
 * The file type object model
 * @interface
 */
export interface StockFileType {
    mediaType: string | null;
    contentType: string | null;
}

/**
 * The object model used when sending file to EJS
 * @interface
 */
export interface StockFile {
    path: string;
    filename: string;
    type: StockFileType;
}

/**
 * @constructor
 * The class where the `config.json` content and path are stored
 */
export class Config {
    /**
     * Configuration object
     */
    config: ConfigObject = { server: { domain: 'localhost', port: 80, rootDir: 'stock', socketTimeout: 300000, keepAliveTimeout: 10000, requestTimeout: 30000, headersTimeout: 10000, signatureExpiry: 86400 }, filesPerPage: 30, maxFilesPerDay: 5000, categories: [] };

    /**
     * Configiration file path
     */
    readonly configFilePath: string | null = null;

    /**
     * @param configFilePath Config file path
     */
    constructor(configFilePath: string) {
        try {
            const config: ConfigObject | null | undefined = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));

            if (config) {
                this.config = config;
                this.configFilePath = configFilePath;
            } else {
                throw new Error('Invalid config file');
            }
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * Refreshes the `config` object, re-reading the `config.json` file
     * @function
     * @returns {boolean} Whether the reload was successful or not
     */
    reload(): boolean {
        try {
            const config: ConfigObject | null | undefined = JSON.parse(fs.readFileSync(this.configFilePath!, 'utf8'));

            if (config) {
                this.config = config;
                return true;
            } else {
                throw new Error('Invalid config file');
            }
        } catch (err) {
            console.log(err);
        }
        return false;
    }

    /**
     * Rewrites the `config.json` from the stored `config` object or the an `newConfig` object (if defined)
     * @function
     * @param newConfig An `ConfigObject` from where to rewrite the config file
     * @returns {boolean} Whether the write task was successful or not
     */
    rewrite(newConfig?: ConfigObject): boolean {
        try {
            if (newConfig) {
                fs.writeFileSync(this.configFilePath!, JSON.stringify(newConfig, null, "\t"), 'utf8');
                this.config = newConfig;
                return true;
            } else {
                fs.writeFileSync(this.configFilePath!, JSON.stringify(this.config, null, "\t"), 'utf8');
                return true;
            }
        } catch (err) {
            console.log(err);
        }
        return false;
    }
}