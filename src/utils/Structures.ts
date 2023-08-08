// External libs
import fs from 'fs';
import { Express } from 'express';
import http from 'http';
import https from 'https';

/**
 * The object model for the command prompt commands
 * @interface
 */
export interface Command {
    name: string;
    aliases: string[];
    execute: (args?: string[]) => Promise<void>;
}

/**
 * The server configuration model
 * @interface
 */
export interface ServerConfig {
    /**
     * The domain name
     */
    domain: string;

    /**
     * The port number
     */
    port: number;

    /**
     * The root directory of the media files
     */
    rootDir: string;

    /**
     * The server's socket timeout
     */
    socketTimeout: number;

    /**
     * The server's keep-alive timeout
     */
    keepAliveTimeout: number;

    /**
     * The server's request timeout
     */
    requestTimeout: number;

    /**
     * The server's headers timeout
     */
    headersTimeout: number;

    /**
     * The signature expiry time
     */
    signatureExpiry: number;
}

/**
 * The object model for the `config.json` file
 * @interface
 */
export interface ConfigObject {
    /**
     * The server configuration
     */
    server: ServerConfig;

    /**
     * The number of files per page
     */
    filesPerPage: number;

    /**
     * The number of files per day
     */
    maxFilesPerDay: number;

    /**
     * The admin password used for catalog administration
     */
    adminPassword: string;

    /**
     * The categories (and subcategories)
     */
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
    /**
     * The year
     */
    year: string;

    /**
     * The month (preceded by a `0` if lower than `10`)
     */
    month: string;

    /**
     * The day (preceded by a `0` if lower than `10`)
     */
    day: string;
}

/**
 * The file type object model
 * @interface
 */
export interface StockFileType {
    /**
     * The type of media (`image` or `video`)
     */
    mediaType: 'image' | 'video' | 'directory' | null;

    /**
     * The media MIME type
     */
    contentType: string | null;
}

/**
 * The object model used when sending file to EJS
 * @interface
 */
export interface StockFile {
    /**
     * The media URL
     */
    url: string;

    /**
     * The URL to the raw served file
     */
    source: string;

    /**
     * The filename of the media
     */
    filename: string;

    /**
     * The media type object
     */
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
    config: ConfigObject = { server: { domain: 'localhost', port: 80, rootDir: 'stock', socketTimeout: 300000, keepAliveTimeout: 10000, requestTimeout: 30000, headersTimeout: 10000, signatureExpiry: 86400 }, filesPerPage: 30, maxFilesPerDay: 5000, adminPassword: 'admin', categories: [] };

    /**
     * Configiration file path
     */
    readonly configFilePath: string | null = null;

    /**
     * @param configFilePath Config file path
     */
    constructor(configFilePath: string) {
        try {
            const config: ConfigObject | null | undefined = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));

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
            const config: ConfigObject | null | undefined = JSON.parse(fs.readFileSync(this.configFilePath!, 'utf-8'));

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
     * Rewrites the `config.json` from the stored `config` object or the a `newConfig` object (if defined)
     * @function
     * @param newConfig A `ConfigObject` from where to rewrite the config file
     * @returns {boolean} Whether the write task was successful or not
     */
    rewrite(newConfig?: ConfigObject): boolean {
        try {
            if (newConfig) {
                fs.writeFileSync(this.configFilePath!, JSON.stringify(newConfig, null, "\t"), 'utf-8');
                this.config = newConfig;
                return true;
            } else {
                fs.writeFileSync(this.configFilePath!, JSON.stringify(this.config, null, "\t"), 'utf-8');
                return true;
            }
        } catch (err) {
            console.log(err);
        }
        return false;
    }
}