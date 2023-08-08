// External libs
import fs from 'fs';
import path from 'path';
import { setTimeout } from 'timers/promises';
import { Request, Response } from 'express';
import http from 'http';
import https from 'https';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import uaParser from 'ua-parser-js';
import crypto from 'crypto';
import readline from 'readline';
const rl: readline.Interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Routes
import root from '../routes/root';
import category from '../routes/category';
import year from '../routes/year';
import month from '../routes/month';
import day from '../routes/day';
import filename from '../routes/filename';

// Internal libs
import { Command, EncryptedSignature, FormattedDate } from './Structures';
import { server, config, commands } from './Storage';

var cmdPrompt: boolean = false;

/**
 * The command prompt command handler
 * @function
 * @returns {void}
 */
export function commandHandler(): void {
    try {
        const commandFiles: string[] = fs.readdirSync(path.resolve('./src/commands'), 'utf-8')
            .filter((command) => fs.lstatSync(path.resolve(`./src/commands/${command}`)).isFile() && path.parse(path.resolve(`./src/commands/${command}`)).ext === path.parse(`${__dirname}/${__filename}`).ext);

        commands.clear();

        for (const command of commandFiles) {
            const commandObj: Command | null | undefined = require(path.resolve(`./src/commands/${command}`)).default;

            if (commandObj && typeof commandObj === 'object') {
                commands.set(commandObj.aliases.concat(commandObj.name), commandObj);
            }
        }
    } catch (err) {
        throw err;
    }
}

/**
 * A command prompt within the application that can be used to perform a variety of tasks
 * @function
 * @returns {Promise<void>}
 */
export async function commandPrompt(): Promise<void> {
    while (true) {
        let answer: string = await new Promise<string>((resolve) => {
            rl.question('Command: ', (input) => {
                resolve(input);
            });
        });

        try {
            let args: string[] = answer.slice(0).split(/ +/);
            let cmd: string | undefined = args.shift();

            if (cmd) {
                cmd = cmd.toLowerCase();
                let commandToExecute: Command | undefined = undefined;

                if (commands.size > 0) {
                    for (let [names, command] of commands.entries()) {
                        if (names.includes(cmd)) {
                            commandToExecute = command;
                            break;
                        }
                    }
                } else {
                    throw 'There are no commands available';
                }

                if (commandToExecute) commandToExecute.execute(args);
                else throw 'Invalid command';

                await setTimeout(1000)
            }
        } catch (err) {
            console.log(err);
            await setTimeout(1000);
        }
    }
}

/**
 * A date formatter that is used when creating stock directories
 * @function
 * @param date A `Date` instance
 * @returns {FormattedDate} the formatted date
 */
export function formatDate(date: Date): FormattedDate {
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();

    let finalDate: FormattedDate = { year: '', month: '', day: '' } as FormattedDate;

    finalDate.year = date.getUTCFullYear().toString();

    if (month.toString().length < 2) {
        finalDate.month = "0" + month.toString();
    } else {
        finalDate.month = month.toString();
    }

    if (day.toString().length < 2) {
        finalDate.day = "0" + day.toString();
    } else {
        finalDate.day = day.toString();
    }

    return finalDate;
}

/**
 * Creates the directories for the stock based on the given `FormattedDate` parameter
 * @function
 * @param date Formatted date
 * @returns {Promise<string>} A promise resolving the number of created folders
 */
export async function createDate(date: FormattedDate): Promise<string> {
    let i = 0;
    return await new Promise((resolve, reject) => {
        try {
            const rootDir = `./${config.config.server.rootDir}`;
            const datePath = `${date.year}/${date.month}/${date.day}`;

            config.config.categories.forEach((category) => {
                if (category.trim() == null || category.trim() == '') return;
                if (/[\\/:*?"<>|]/ig.test(category)) return;

                const fullPath = path.resolve(`${rootDir}/${category}/${datePath}`);

                if (!fs.existsSync(fullPath)) {
                    i++;
                    fs.mkdirSync(fullPath, { recursive: true });
                }
            });
        } catch (err) {
            reject(err);
        }
        resolve(i.toString());
    });
}

/**
 * Checks if a string is a positive integer
 * @function
 * @param text The string to be checked
 * @returns {boolean} Whether `text` is a positive integer
 */
export function isInteger(text: string): boolean {
    if (text.length === 0) return false;

    if (isNaN(Number(text)) || !Number.isSafeInteger(Number(text)) || !Number.isInteger(Number(text))) return false;

    let isInteger: boolean = true;
    for (let i = 0; i < text.length; i++) {
        if (isNaN(Number(text.charAt(i))) || !Number.isSafeInteger(Number(text.charAt(i)))) { isInteger = false; break; }
    }

    if (parseInt(text) <= 0) isInteger = false;

    return isInteger;
}

/**
 * Generates the AES key (for the signatures)
 * @function
 * @returns {void}
 */
export function generateKey(): void {
    try {
        process.env.KEY = crypto.randomBytes(16).toString('hex').toString();
    } catch (err) {
        console.log(err);
    }
}

/**
 * Encrypts signatures
 * @function
 * @param query The string to encrypt
 * @param secret The decryption key
 * @returns {EncryptedSignature | null} An object containing the `initialization vector` and the `encrypted string` or `null`, in case of an error
 */
export function generateSignature(query: string, secret: Buffer): EncryptedSignature | null {
    try {
        let iv = crypto.randomBytes(16);
        let cipher = crypto.createCipheriv('aes-128-cbc', secret, iv);
        let encryptedQuery = cipher.update(query, 'utf-8', 'hex');
        encryptedQuery += cipher.final('hex');

        return { iv: iv.toString('hex'), signature: encryptedQuery };
    } catch (err) {
        console.log(err);
        return null;
    }
}

/**
 * Decrypts signatures
 * @function
 * @param encryptedQuery The encrypted string
 * @param secret The decryption key
 * @param iv The initialization vector
 * @returns {string | null} The `decrypted string` or `null`, in case of an error
 */
export function decryptSignature(encryptedQuery: string, secret: Buffer, iv: string): string | null {
    try {
        let decipher = crypto.createDecipheriv('aes-128-cbc', secret, Buffer.from(iv, 'hex'));
        let decryptedQuery = decipher.update(encryptedQuery, 'hex', 'utf-8');
        decryptedQuery += decipher.final('utf-8');

        return decryptedQuery;
    } catch (err) {
        return null;
    }
}

/**
 * Checks the difference between a given time and the current time
 * 
 * @function
 * @param time The time (in seconds)
 * @param maxDifference The maximum required difference between `Date.now()` and `time`
 * @returns {boolean} Whether the difference between `Date.now()` and `time` is less than or equal to `maxDifference`
 */
export function checkDifference(time: string | number, maxDifference: number): boolean {
    try {
        let timestamp = parseInt(time.toString(), 10);
        let difference = Math.floor((Date.now() - timestamp) / 1000);

        return difference <= maxDifference;
    } catch (err) {
        console.log(err);
        return false;
    }
}

/**
 * Checks if the `User-Agent` header value is valid
 * 
 * @function
 * @param req The request object
 * @returns {boolean} Whether the user is valid, based on the `User-Agent` header
 */
export function checkUserAgent(req: Request): boolean {
    try {
        const userAgent: string | undefined = req.headers['user-agent'];

        if (userAgent) {
            if (RegExp(/(?:discordbot|discordapp(?:\.com)?|discord\.com|twitterbot)/gi).test(userAgent)) return true;

            const ua: uaParser.IResult = uaParser(userAgent);
            return ua.browser.name !== undefined && ua.browser.version !== undefined && ua.engine.name !== undefined && ua.engine.version !== undefined && ua.os.name !== undefined && ua.os.version !== undefined;
        }
    } catch (err) {
        console.log(err);
    }

    return false;
}

/**
 * Setups the server and the Express routes
 * @function
 * @returns {void}
 */
export function serverSetup(): void {
    if (server.app) {
        try {
            server.app.disable('x-powered-by');
            server.app.set('view engine', 'ejs');
            server.app.set('views', path.resolve(`./views`));

            if (process.env.NODE_ENV === 'development') {
                server.app.use((req, _res, next) => {
                    console.log(`\n${new Date(Date.now()).toString()}:\nIP: ${req.ip}\nURL: ${req.originalUrl}\nMethod: ${req.method}\nRequest headers:\n  ${req.rawHeaders.map((value, index) => (index % 2 === 0) ? `\n  ${value.trim()}` : `: ${value.trim()}`).join('').trim()}\nRequest body: ${req.body}`);
                    next();
                });
            }

            server.app.use(cors(), helmet({
                contentSecurityPolicy: {
                    useDefaults: false,
                    reportOnly: false,
                    directives: {
                        'default-src': ["'self'"],
                        'base-uri': ["'self'"],
                        'font-src': ["'self'", 'https:', 'data:'],
                        'form-action': ["'self'"],
                        'frame-ancestors': ["*"],
                        'img-src': ["'self'", 'data:'],
                        'video-src': ["'self'", 'data:'],
                        'media-src': ["'self'", 'data:'],
                        'object-src': ["'none'"],
                        'script-src': ["'self'", "'unsafe-inline'"],
                        'script-src-attr': ["'none'", "'unsafe-inline'"],
                        'style-src': ["'self'", 'https:', "'unsafe-inline'"],
                        ...(process.env.TLS_KEY && process.env.TLS_CERT ? { 'upgrade-insecure-requests': [] } : {})
                    }
                },
                crossOriginEmbedderPolicy: { policy: 'require-corp' },
                crossOriginOpenerPolicy: (process.env.TLS_KEY && process.env.TLS_CERT) ? { policy: 'same-origin' } : false,
                crossOriginResourcePolicy: { policy: 'cross-origin' },
                dnsPrefetchControl: { allow: false },
                frameguard: { action: 'sameorigin' },
                hidePoweredBy: true,
                hsts: process.env.TLS_KEY !== undefined && process.env.TLS_CERT !== undefined,
                ieNoOpen: true,
                noSniff: true,
                originAgentCluster: false,
                permittedCrossDomainPolicies: { permittedPolicies: 'none' },
                referrerPolicy: { policy: 'no-referrer' },
                xssFilter: false
            }), (_req, res, next) => {
                res.set('Origin-Agent-Cluster', getURL());
                res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0');
                res.set('Expires', 'Mon, 01 Jan 1990 00:00:00 GMT');
                res.set('Pragma', 'no-cache');

                next();
            }, compression(), (req, res, next) => {
                const isUAValid: boolean = checkUserAgent(req);
                const isHostValid: boolean = (req.headers.host) ? (req.headers.host === config.config.server.domain) || (req.headers.host === `${config.config.server.domain}:${getURLPort(config.config.server.port, true)}`) : false;

                if (!isUAValid || !isHostValid || req.xhr) {
                    res.redirect('http://127.0.0.1');
                    if (process.env.NODE_ENV === 'development') console.log(`${req.ip} redirected`);
                } else next();
            },
                root, category, year, month, day, filename, (_req, res, _next) => {
                    res.status(404).end();
                });

            if (process.env.TLS_KEY && process.env.TLS_CERT) {
                server.server = https.createServer({ key: fs.readFileSync(path.resolve(process.env.TLS_KEY)), cert: fs.readFileSync(path.resolve(process.env.TLS_CERT)) }, server.app);
            } else {
                server.server = http.createServer(server.app);
            }

            server.server.timeout = config.config.server.socketTimeout;
            server.server.keepAliveTimeout = config.config.server.keepAliveTimeout;
            server.server.requestTimeout = config.config.server.requestTimeout;
            server.server.headersTimeout = config.config.server.headersTimeout;

            generateKey();

            server.server.listen(config.config.server.port, () => {
                console.log(`Listening on port ${config.config.server.port} ${(process.env.TLS_KEY && process.env.TLS_CERT) ? '(HTTPS)' : '(HTTP)'}`);
                if (!cmdPrompt) {
                    cmdPrompt = true;
                    commandPrompt();
                }
            });
        } catch (err) {
            console.log(err);
            process.exit(7);
        }
    } else {
        console.log('Express app not initialized');
        process.exit(0);
    }
}

/**
 * Closes all connections and stops the server
 * @function
 * @returns {void}
 */
export function stopServer(): void {
    try {
        if (server.app) server.app.removeAllListeners();

        if (server.server) {
            server.server.removeAllListeners();
            server.server.closeAllConnections();
            server.server.unref();
            server.server.close((err) => {
                if (err) {
                    if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
                    process.exit(0);
                }
            });
        }
    } catch (err) {
        console.log(err);
        process.exit(0);
    }
}

/**
 * Adds a category to config
 * @function
 * @param name The category's name
 * @returns {void}
 */
export function addCategory(name: string): void {

    if (!config.config.categories.includes(name)) {
        if (/[\\/:*?"<>|]/ig.test(name)) { console.log('The category name must not contain the following characters:\n\\ / : * ? " < > |'); return; }

        config.config.categories.push(name);
        config.rewrite();

        console.log(`Category \"${name}\" has been created. You need to use the \"createtoday\" command to create its folder`);
    } else {
        console.log(`A category named \"${name}\" already exists`);
    }
}

/**
 * Changes the domain name for the server
 * @function
 * @param domain The new domain name
 * @returns {void}
 */
export function changeDomain(domain: string): void {
    config.config.server.domain = domain;
    config.rewrite();

    console.log('Domain changed successfully. You may need to restart the server for the changes to take effect');
}

/**
 * Changes the port for the server
 * @function
 * @param port The new port
 * @returns {void}
 */
export function changePort(port: number): void {
    config.config.server.port = port;
    config.rewrite();

    console.log('Port changed successfully. You need to restart the server for the changes to take effect');
}

/**
 * Changes the root directory of the server
 * @function
 * @param dirName The new directory name
 * @returns {void}
 */
export function changeDir(dirName: string): void {
    config.config.server.rootDir = dirName;
    config.rewrite();

    console.log('Directory changed successfully. You need to restart the server for the changes to take effect. You will also need to run the \"createtoday\" command to create the new folder');
}

/**
 * Changes the server's `socket` timeout
 * @function
 * @param timeout The new `socket` timeout
 * @returns {void}
 */
export function changeSocketTimeout(timeout: number): void {
    config.config.server.socketTimeout = timeout;
    config.rewrite();
    if (server.server) server.server.timeout = config.config.server.socketTimeout;

    console.log('Socket timeout changed successfully. Note that the timeout for existing connections has not been changed');
}

/**
 * Changes the server's `keep-alive` timeout
 * @function
 * @param timeout The new `keep-alive` timeout
 * @returns {void}
 */
export function changeKeepAliveTimeout(timeout: number): void {
    config.config.server.keepAliveTimeout = timeout;
    config.rewrite();
    if (server.server) server.server.keepAliveTimeout = config.config.server.keepAliveTimeout;

    console.log('Server keep-alive timeout changed successfully. Note that the timeout for existing connections has not been changed');
}

/**
 * Changes the server's `request` timeout
 * @function
 * @param timeout The new `request` timeout
 * @returns {void}
 */
export function changeRequestTimeout(timeout: number): void {
    config.config.server.requestTimeout = timeout;
    config.rewrite();
    if (server.server) server.server.requestTimeout = config.config.server.requestTimeout;

    console.log('Server request timeout changed successfully. Note that the timeout for existing connections has not been changed');
}

/**
 * Changes the server's `headers` timeout
 * @function
 * @param timeout The new `headers` timeout
 * @returns {void}
 */
export function changeHeadersTimeout(timeout: number): void {
    config.config.server.headersTimeout = timeout;
    config.rewrite();
    if (server.server) server.server.headersTimeout = config.config.server.headersTimeout;

    console.log('Server headers timeout changed successfully. Note that the timeout for existing connections has not been changed');
}

/**
 * Changes the expiration time of the signatures
 * @function
 * @param expiry The new expiry time
 * @return {void}
 */
export function changeSignatureExpiry(expiry: number): void {
    config.config.server.signatureExpiry = expiry;
    config.rewrite();

    generateKey();

    console.log('Signature expiry time changed successfully. The existing signatures have been invalidated');
}

/**
 * Changes the number of files per page
 * @function
 * @param filesPerPage The new `files per day` value
 * @returns {void}
 */
export function changeFilesPerPage(filesPerPage: number): void {
    config.config.filesPerPage = filesPerPage;
    config.rewrite();

    console.log('Files per page value changed successfully');
}

/**
 * Changes the maximum number of files per day
 * @function
 * @param maxFilesPerDay The new `max files per day` value
 * @returns {void}
 */
export function changeMaxFilesPerDay(maxFilesPerDay: number): void {
    config.config.maxFilesPerDay = maxFilesPerDay;
    config.rewrite();

    console.log('Maximum files per day value changed successfully');
}

/**
 * Changes the admin password
 * @function
 * @param password The new password
 * @returns {void}
 */
export function changeAdminPassword(password: string): void {
    config.config.adminPassword = password;
    config.rewrite();

    console.log('Admin password changed successfully');
}

/**
 * Sends a forbidden response to a request (typically when a signature expires)
 * @function
 * @param res The response object
 * @returns {boolean} Whether the file was successfully sent or an error occurred
 */
export function sendForbidden(res: Response): boolean {
    try {
        res.set('Content-Type', 'image/jpeg');
        res.status(200).sendFile(path.resolve(`./views/403.jpg`), (err) => {
            if (err) {
                if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
                res.status(500).end();
            }
        });
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

/**
 * Gets the HTTP protocol based on the presence of a TLS certificate
 * @function
 * @returns {'http' | 'https'} The URL protocol
 */
export function getURLProtocol(): 'http' | 'https' {
    if (process.env.TLS_CERT && process.env.TLS_KEY) {
        return 'https';
    } else {
        return 'http';
    }
}

/**
 * Gets the port in the URL syntax
 * 
 * Returns `''` if the port is either `80` or `443` and `keepPort` is not provided, `undefined` or `false`, as modern browsers omit the port if it is one of those two
 * @function
 * @param port The port
 * @param keepPort Whether to return the `port` with a leading `:`, even if `80` or `443`
 * @returns {'' | `:${number}`} The port in URL syntax (`:port`) or `''`, if `80` or '443' and `keepPort` is not provided, `undefined` or `false`
 */
export function getURLPort(port: number, keepPort?: boolean | undefined): '' | `:${number}` {
    try {
        if (isInteger(port.toString())) {
            if ((port === 80 || port === 443) && !keepPort) {
                return '';
            } else {
                return `:${port}`;
            }
        } else {
            throw new Error('Invalid port number');
        }
    } catch (err) {
        throw err;
    }
}

/**
 * Constructs the stock URL, based on what URI components are provided
 * @function
 * @param root The root directory
 * @param category The category
 * @param year The year
 * @param month The month
 * @param day The day
 * @param dir The directory
 * @param thumbs Whether the URL lead to a thumbnail
 * @param filename The filename
 * @returns {string} The URL
 */
export function getURL(root?: string, category?: string, year?: string, month?: string, day?: string, dir?: string | undefined, thumbs?: boolean, filename?: string): string {
    let url: string = `${getURLProtocol()}://${config.config.server.domain}${getURLPort(config.config.server.port)}`;

    if (root) {
        url += `/${root}`;

        if (category) {
            url += `/${category}`;

            if (year) {
                url += `/${year}`;

                if (month) {
                    url += `/${month}`;

                    if (day) {
                        url += `/${day}`;

                        if (dir) {
                            url += `/${dir}`;
                        }

                        if (thumbs) {
                            url += '/thumbs';
                        }

                        if (filename) {
                            url += `/${filename}${(thumbs) ? '_thumb.png' : ''}`;
                        }
                    }
                }
            }
        }
    }

    return url;
}