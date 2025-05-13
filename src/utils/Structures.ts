// External libs
import fs from 'fs';
import { Pool } from "express-mysql-session/node_modules/mysql2/typings/mysql/index";
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

export interface DatabaseObject {
    /**
     * The hostname of the database you are connecting to
     */
    host: string;

    /**
     * The port number to connect to
     */
    port: number;

    /**
     * The MySQL user to authenticate as
     */
    user: string;

    /**
     * The password of that MySQL user
     */
    password: string;

    /**
     * Name of the database to use for this connection
     */
    database: string;

    /**
     * The maximum number of connections to create at once
     */
    connectionLimit: number;

    /**
     * The maximum number of idle connections
     */
    maxIdle: number;

    /**
     * The idle connections timeout, in milliseconds
     */
    idleTimeout: number;

    /**
     * Enable keep-alive on the socket
     */
    enableKeepAlive: boolean;
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
     * The database connection settings
     */
    database: DatabaseObject;

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
     * Files (in the `views` folder) allowed to be sent to the client
     */
    viewsFiles: string[];
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

    /**
     * The database connection pool
     */
    database: Pool | undefined;
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
    source: string | null;

    /**
     * The filename of the media
     */
    filename: string;

    /**
     * The media type object
     */
    type: StockFileType;

    /**
     * The width of the media
     */
    width: number | null;

    /**
     * The height of the media
     */
    height: number | null;
}

/**
 * The object model for `session.user`
 * @interface
 */
export interface User {
    user_id: number;
    username: string;
    email: string;
    password?: string;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    creation_date: number;
    last_active: number;
    admin: boolean;
    expire?: number;
}

/**
 * @constructor
 * The class where the `config.json` content and path are stored
 */
export class Config {
    /**
     * Configuration object
     */
    config: ConfigObject = { server: { domain: 'localhost', port: 80, rootDir: 'stock', socketTimeout: 300000, keepAliveTimeout: 10000, requestTimeout: 30000, headersTimeout: 10000, signatureExpiry: 86400 }, database: { host: 'localhost', port: 3306, user: '', password: '', database: '', connectionLimit: 10, maxIdle: 10, idleTimeout: 60000, enableKeepAlive: true }, filesPerPage: 30, maxFilesPerDay: 5000, adminPassword: 'admin', viewsFiles: [] };

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

            if (config && typeof config === 'object') {
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

            if (config && typeof config === 'object') {
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