/// <reference types="node" />
/// <reference types="node" />
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
    signature: string;
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
export declare class Config {
    /**
     * Configuration object
     */
    config: ConfigObject;
    /**
     * Configiration file path
     */
    readonly configFilePath: string | null;
    /**
     * @param configFilePath Config file path
     */
    constructor(configFilePath: string);
    /**
     * Refreshes the `config` object, re-reading the `config.json` file
     * @function
     * @returns {boolean} Whether the reload was successful or not
     */
    reload(): boolean;
    /**
     * Rewrites the `config.json` from the stored `config` object or the an `newConfig` object (if defined)
     * @function
     * @param newConfig An `ConfigObject` from where to rewrite the config file
     * @returns {boolean} Whether the write task was successful or not
     */
    rewrite(newConfig?: ConfigObject): boolean;
}
//# sourceMappingURL=Structures.d.ts.map