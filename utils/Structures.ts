import { EmbedBuilder, Snowflake } from 'discord.js';
import fs from 'fs';
import path from 'path';

export declare interface ExpressConfig {
    domain: string;
    rootDir: string;
    port: number;
    serverTimeout: number;
}

export declare type EmbedTitle = 'download' | 'filename' | 'fullfilename';

export declare interface CategoryConfig {
    name: string;
    channelID: Snowflake;
    embedTitle: EmbedTitle;
}

export declare interface ConfigObject {
    express: ExpressConfig;
    serverID: Snowflake;
    categories: CategoryConfig[];
}

export declare interface FormattedDate {
    year: string;
    month: string;
    day: string;
}

export declare interface FilesEmbeds {
    embeds: EmbedBuilder[];
    files: string[];
}

/**
 * @constructor
 */
export class Config {
    /**
     * Configuration object
     */
    config: ConfigObject = { express: { domain: 'localhost', rootDir: 'stock', port: 3000, serverTimeout: 300000 }, serverID: '', categories: [] };

    /**
     * Configiration file path
     */
    readonly configFilePath: string | null = null;

    /**
     * @param configFilePath Config file path
     */
    constructor(configFilePath: string) {
        try {
            configFilePath = path.resolve(configFilePath);
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
     * @function
     * @returns {boolean}
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
     * @function
     * @param newConfig
     * @returns {boolean}
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