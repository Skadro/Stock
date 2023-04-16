"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getURLPort = exports.getURLProtocol = exports.sendForbidden = exports.changeMaxFilesPerDay = exports.changeFilesPerPage = exports.changeSignatureExpiry = exports.changeHeadersTimeout = exports.changeRequestTimeout = exports.changeKeepAliveTimeout = exports.changeSocketTimeout = exports.changeDir = exports.changePort = exports.changeDomain = exports.addCategory = exports.stopServer = exports.serverSetup = exports.checkDifference = exports.decryptSignature = exports.generateSignature = exports.generateKey = exports.isInteger = exports.createDate = exports.formatDate = exports.commandPrompt = exports.commandHandler = void 0;
// External libs
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const promises_1 = require("timers/promises");
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const crypto_1 = __importDefault(require("crypto"));
const readline_1 = __importDefault(require("readline"));
const rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout,
});
// Routes
const root_1 = __importDefault(require("../routes/root"));
const category_1 = __importDefault(require("../routes/category"));
const year_1 = __importDefault(require("../routes/year"));
const month_1 = __importDefault(require("../routes/month"));
const day_1 = __importDefault(require("../routes/day"));
const filename_1 = __importDefault(require("../routes/filename"));
const Storage_1 = require("./Storage");
var cmdPrompt = false;
/**
 * The command prompt command handler
 * @function
 * @returns {void}
 */
function commandHandler() {
    try {
        const commandFiles = fs_1.default.readdirSync(path_1.default.resolve('./src/commands'), 'utf8')
            .filter((command) => fs_1.default.lstatSync(path_1.default.resolve(`./src/commands/${command}`)).isFile() && path_1.default.parse(path_1.default.resolve(`./src/commands/${command}`)).ext === path_1.default.parse(`${__dirname}/${__filename}`).ext);
        Storage_1.commands.clear();
        for (const command of commandFiles) {
            const commandObj = require(path_1.default.resolve(`./src/commands/${command}`)).default;
            if (commandObj) {
                Storage_1.commands.set(commandObj.aliases.concat(commandObj.name), commandObj);
            }
        }
    }
    catch (err) {
        throw err;
    }
}
exports.commandHandler = commandHandler;
/**
 * A command prompt within the application that can be used to perform a variety of tasks
 * @function
 * @returns {Promise<void>}
 */
async function commandPrompt() {
    while (true) {
        let answer = await new Promise((resolve) => {
            rl.question('Command: ', (input) => {
                resolve(input);
            });
        });
        try {
            let args = answer.slice(0).split(/ +/);
            let cmd = args.shift();
            if (cmd) {
                cmd = cmd.toLowerCase();
                let commandToExecute = undefined;
                if (Storage_1.commands.size > 0) {
                    for (let [names, command] of Storage_1.commands.entries()) {
                        if (names.includes(cmd)) {
                            commandToExecute = command;
                            break;
                        }
                    }
                }
                else {
                    throw 'There are no commands available';
                }
                if (commandToExecute)
                    commandToExecute.execute(args);
                else
                    throw 'Invalid command';
                await (0, promises_1.setTimeout)(1000);
            }
        }
        catch (err) {
            console.log(err);
            await (0, promises_1.setTimeout)(1000);
        }
    }
}
exports.commandPrompt = commandPrompt;
/**
 * A date formatter that is used when creating stock directories
 * @function
 * @param date A `Date` instance
 * @returns {FormattedDate} the formatted date
 */
function formatDate(date) {
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    let finalDate = { year: '', month: '', day: '' };
    finalDate.year = date.getUTCFullYear().toString();
    if (month.toString().length < 2) {
        finalDate.month = "0" + month.toString();
    }
    else {
        finalDate.month = month.toString();
    }
    if (day.toString().length < 2) {
        finalDate.day = "0" + day.toString();
    }
    else {
        finalDate.day = day.toString();
    }
    return finalDate;
}
exports.formatDate = formatDate;
/**
 * Creates the directories for the stock based on the given `FormattedDate` parameter
 * @function
 * @param date Formatted date
 * @returns {Promise<string>} A promise resolving the number of created folders
 */
async function createDate(date) {
    let i = 0;
    return await new Promise((resolve, reject) => {
        try {
            const rootDir = `./${Storage_1.config.config.server.rootDir}`;
            const datePath = `${date.year}/${date.month}/${date.day}`;
            Storage_1.config.config.categories.forEach((category) => {
                if (category.trim() == null || category.trim() == '')
                    return;
                if (/[\\/:*?"<>|]/ig.test(category))
                    return;
                const fullPath = path_1.default.resolve(`${rootDir}/${category}/${datePath}`);
                if (!fs_1.default.existsSync(fullPath)) {
                    i++;
                    fs_1.default.mkdirSync(fullPath, { recursive: true });
                }
            });
        }
        catch (err) {
            reject(err);
        }
        resolve(i.toString());
    });
}
exports.createDate = createDate;
/**
 * Checks if a string is a positive integer
 * @function
 * @param text The string to be checked
 * @returns {boolean} Whether `text` is a positive integer
 */
function isInteger(text) {
    if (text.length === 0)
        return false;
    if (isNaN(Number(text)) || !Number.isSafeInteger(Number(text)) || !Number.isInteger(Number(text)))
        return false;
    let isInteger = true;
    for (let i = 0; i < text.length; i++) {
        if (isNaN(Number(text.charAt(i))) || !Number.isSafeInteger(Number(text.charAt(i)))) {
            isInteger = false;
            break;
        }
    }
    if (parseInt(text) <= 0)
        isInteger = false;
    return isInteger;
}
exports.isInteger = isInteger;
/**
 * Generates the AES key (for the signatures)
 * @function
 * @returns {void}
 */
function generateKey() {
    try {
        let dir = path_1.default.resolve('./signature');
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir);
        fs_1.default.writeFileSync(`${dir}/key`, crypto_1.default.randomBytes(32).toString('hex'));
    }
    catch (err) {
        console.log(err);
    }
}
exports.generateKey = generateKey;
/**
 * Encrypts signatures
 * @function
 * @param query The string to encrypt
 * @param secret The decryption key
 * @returns {EncryptedSignature | null} An object containing the `initialization vector` and the `encrypted string` or `null`, in case of an error
 */
function generateSignature(query, secret) {
    try {
        let iv = crypto_1.default.randomBytes(16);
        let cipher = crypto_1.default.createCipheriv('aes-256-cbc', secret, iv);
        let encryptedQuery = cipher.update(query, 'utf8', 'hex');
        encryptedQuery += cipher.final('hex');
        return { iv: iv.toString('hex'), signature: encryptedQuery };
    }
    catch (err) {
        console.log(err);
        return null;
    }
}
exports.generateSignature = generateSignature;
/**
 * Decrypts signatures
 * @function
 * @param encryptedQuery The encrypted string
 * @param secret The decryption key
 * @param iv The initialization vector
 * @returns {string | null} The `decrypted string` or `null`, in case of an error
 */
function decryptSignature(encryptedQuery, secret, iv) {
    try {
        let decipher = crypto_1.default.createDecipheriv('aes-256-cbc', secret, Buffer.from(iv, 'hex'));
        let decryptedQuery = decipher.update(encryptedQuery, 'hex', 'utf8');
        decryptedQuery += decipher.final('utf8');
        return decryptedQuery;
    }
    catch {
        return null;
    }
}
exports.decryptSignature = decryptSignature;
/**
 * Checks the difference between a given time and the current time
 * @function
 * @param time The time (in seconds)
 * @param maxDifference The maximum required difference between `Date.now()` and `time`
 * @returns {boolean} Whether the difference between `Date.now()` and `time` is less than or equal to `maxDifference`
 */
function checkDifference(time, maxDifference) {
    try {
        let timestamp = parseInt(time.toString(), 10);
        let difference = Math.floor((Date.now() - timestamp) / 1000);
        return difference <= maxDifference;
    }
    catch {
        return false;
    }
}
exports.checkDifference = checkDifference;
/**
 * Setups the server and the Express routes
 * @function
 * @returns {void}
 */
function serverSetup() {
    if (Storage_1.server.app) {
        try {
            Storage_1.server.app.disable('x-powered-by');
            Storage_1.server.app.set('view engine', 'ejs');
            Storage_1.server.app.set('views', path_1.default.resolve(`./views`));
            if (process.env.NODE_ENV === 'development') {
                Storage_1.server.app.use((req, _res, next) => {
                    console.log(`${new Date(Date.now()).toString()}:\nIP: ${req.ip}\nURL: ${req.originalUrl}\nMethod: ${req.method}\nRequest headers:\n  ${req.rawHeaders.map((value, index) => (index % 2 === 0) ? `\n  ${value.trim()}` : `: ${value.trim()}`).join('').trim()}\nRequest body: ${req.body}`);
                    next();
                });
            }
            Storage_1.server.app.use((0, cors_1.default)(), (0, helmet_1.default)({
                contentSecurityPolicy: {
                    useDefaults: false,
                    reportOnly: false,
                    directives: {
                        'default-src': ["'self'"],
                        'base-uri': ["'self'"],
                        'font-src': ["'self'", 'https:', 'data:'],
                        'form-action': ["'self'"],
                        'frame-ancestors': ["'self'"],
                        'img-src': ["'self'", 'data:'],
                        'object-src': ["'none'"],
                        'script-src': ["'self'"],
                        'script-src-attr': ["'none'"],
                        'style-src': ["'self'", 'https:'],
                        ...(process.env.TLS_KEY && process.env.TLS_CERT ? { 'upgrade-insecure-requests': [] } : {})
                    }
                },
                crossOriginEmbedderPolicy: { policy: 'require-corp' },
                crossOriginOpenerPolicy: (process.env.TLS_KEY && process.env.TLS_CERT) ? { policy: 'same-origin' } : false,
                crossOriginResourcePolicy: { policy: 'same-origin' },
                dnsPrefetchControl: { allow: false },
                frameguard: { action: 'sameorigin' },
                hidePoweredBy: true,
                hsts: (process.env.TLS_KEY && process.env.TLS_CERT) ? true : false,
                ieNoOpen: true,
                noSniff: true,
                originAgentCluster: false,
                permittedCrossDomainPolicies: { permittedPolicies: 'none' },
                referrerPolicy: { policy: 'no-referrer' },
                xssFilter: false
            }), (_req, res, next) => {
                res.set('Origin-Agent-Cluster', `${getURLProtocol()}://${Storage_1.config.config.server.domain}${getURLPort(Storage_1.config.config.server.port)}`);
                res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0');
                res.set('Expires', 'Mon, 01 Jan 1990 00:00:00 GMT');
                res.set('Pragma', 'no-cache');
                next();
            }, (0, compression_1.default)(), root_1.default, category_1.default, year_1.default, month_1.default, day_1.default, filename_1.default, (_req, res, _next) => {
                res.status(404).end();
            });
            if (process.env.TLS_KEY && process.env.TLS_CERT) {
                Storage_1.server.server = https_1.default.createServer({ key: fs_1.default.readFileSync(path_1.default.resolve(process.env.TLS_KEY)), cert: fs_1.default.readFileSync(path_1.default.resolve(process.env.TLS_CERT)) }, Storage_1.server.app);
            }
            else {
                Storage_1.server.server = http_1.default.createServer(Storage_1.server.app);
            }
            Storage_1.server.server.timeout = Storage_1.config.config.server.socketTimeout;
            Storage_1.server.server.keepAliveTimeout = Storage_1.config.config.server.keepAliveTimeout;
            Storage_1.server.server.requestTimeout = Storage_1.config.config.server.requestTimeout;
            Storage_1.server.server.headersTimeout = Storage_1.config.config.server.headersTimeout;
            generateKey();
            Storage_1.server.server.listen(Storage_1.config.config.server.port, () => {
                console.log(`Listening on port ${Storage_1.config.config.server.port} ${(process.env.TLS_KEY && process.env.TLS_CERT) ? '(HTTPS)' : '(HTTP)'}`);
                if (!cmdPrompt) {
                    cmdPrompt = true;
                    commandPrompt();
                }
            });
        }
        catch (err) {
            console.log(err);
            process.exit(7);
        }
    }
    else {
        console.log('Express app not initialized');
        process.exit(0);
    }
}
exports.serverSetup = serverSetup;
/**
 * Closes all connections and stops the server
 * @function
 * @returns {void}
 */
function stopServer() {
    try {
        if (Storage_1.server.app)
            Storage_1.server.app.removeAllListeners();
        if (Storage_1.server.server) {
            Storage_1.server.server.removeAllListeners();
            Storage_1.server.server.closeAllConnections();
            Storage_1.server.server.unref();
            Storage_1.server.server.close((err) => {
                if (err) {
                    if (process.env.NODE_ENV && process.env.NODE_ENV === 'development')
                        console.log(err);
                    process.exit(0);
                }
            });
        }
    }
    catch (err) {
        console.log(err);
    }
}
exports.stopServer = stopServer;
/**
 * Adds a category to config
 * @function
 * @param name The category's name
 * @returns {void}
 */
function addCategory(name) {
    if (!Storage_1.config.config.categories.includes(name)) {
        if (/[\\/:*?"<>|]/ig.test(name)) {
            console.log('The category name must not contain the following characters:\n\\ / : * ? " < > |');
            return;
        }
        Storage_1.config.config.categories.push(name);
        Storage_1.config.rewrite();
        console.log(`Category \"${name}\" has been created. You need to use the \"createtoday\" command to create its folder`);
    }
    else {
        console.log(`A category named \"${name}\" already exists`);
    }
}
exports.addCategory = addCategory;
/**
 * Changes the domain name for the server
 * @function
 * @param domain The new domain name
 * @returns {void}
 */
function changeDomain(domain) {
    Storage_1.config.config.server.domain = domain;
    Storage_1.config.rewrite();
    console.log('Domain changed successfully. You may need to restart the server for the changes to take effect');
}
exports.changeDomain = changeDomain;
/**
 * Changes the port for the server
 * @function
 * @param port The new port
 * @returns {void}
 */
function changePort(port) {
    Storage_1.config.config.server.port = port;
    Storage_1.config.rewrite();
    console.log('Port changed successfully. You need to restart the server for the changes to take effect');
}
exports.changePort = changePort;
/**
 * Changes the root directory of the server
 * @function
 * @param dirName The new directory name
 * @returns {void}
 */
function changeDir(dirName) {
    Storage_1.config.config.server.rootDir = dirName;
    Storage_1.config.rewrite();
    console.log('Directory changed successfully. You need to restart the server for the changes to take effect. You will also need to run the \"createtoday\" command to create the new folder');
}
exports.changeDir = changeDir;
/**
 * Changes the server's `socket` timeout
 * @function
 * @param timeout The new `socket` timeout
 * @returns {void}
 */
function changeSocketTimeout(timeout) {
    Storage_1.config.config.server.socketTimeout = timeout;
    Storage_1.config.rewrite();
    if (Storage_1.server.server)
        Storage_1.server.server.timeout = Storage_1.config.config.server.socketTimeout;
    console.log('Socket timeout changed successfully. Note that the timeout for existing connections has not been changed');
}
exports.changeSocketTimeout = changeSocketTimeout;
/**
 * Changes the server's `keep-alive` timeout
 * @function
 * @param timeout The new `keep-alive` timeout
 * @returns {void}
 */
function changeKeepAliveTimeout(timeout) {
    Storage_1.config.config.server.keepAliveTimeout = timeout;
    Storage_1.config.rewrite();
    if (Storage_1.server.server)
        Storage_1.server.server.keepAliveTimeout = Storage_1.config.config.server.keepAliveTimeout;
    console.log('Server keep-alive timeout changed successfully. Note that the timeout for existing connections has not been changed');
}
exports.changeKeepAliveTimeout = changeKeepAliveTimeout;
/**
 * Changes the server's `request` timeout
 * @function
 * @param timeout The new `request` timeout
 * @returns {void}
 */
function changeRequestTimeout(timeout) {
    Storage_1.config.config.server.requestTimeout = timeout;
    Storage_1.config.rewrite();
    if (Storage_1.server.server)
        Storage_1.server.server.requestTimeout = Storage_1.config.config.server.requestTimeout;
    console.log('Server request timeout changed successfully. Note that the timeout for existing connections has not been changed');
}
exports.changeRequestTimeout = changeRequestTimeout;
/**
 * Changes the server's `headers` timeout
 * @function
 * @param timeout The new `headers` timeout
 * @returns {void}
 */
function changeHeadersTimeout(timeout) {
    Storage_1.config.config.server.headersTimeout = timeout;
    Storage_1.config.rewrite();
    if (Storage_1.server.server)
        Storage_1.server.server.headersTimeout = Storage_1.config.config.server.headersTimeout;
    console.log('Server headers timeout changed successfully. Note that the timeout for existing connections has not been changed');
}
exports.changeHeadersTimeout = changeHeadersTimeout;
/**
 * Changes the expiration time of the signatures
 * @function
 * @param expiry The new expiry time
 * @return {void}
 */
function changeSignatureExpiry(expiry) {
    Storage_1.config.config.server.signatureExpiry = expiry;
    Storage_1.config.rewrite();
    generateKey();
    console.log('Signature expiry time changed successfully. The existing signatures have been invalidated');
}
exports.changeSignatureExpiry = changeSignatureExpiry;
/**
 * Changes the number of files per page
 * @function
 * @param filesPerPage The new `files per day` value
 * @returns {void}
 */
function changeFilesPerPage(filesPerPage) {
    Storage_1.config.config.filesPerPage = filesPerPage;
    Storage_1.config.rewrite();
    console.log('Files per page value changed successfully');
}
exports.changeFilesPerPage = changeFilesPerPage;
/**
 * Changes the maximum number of files per day
 * @function
 * @param maxFilesPerDay The new `max files per day` value
 * @returns {void}
 */
function changeMaxFilesPerDay(maxFilesPerDay) {
    Storage_1.config.config.maxFilesPerDay = maxFilesPerDay;
    Storage_1.config.rewrite();
    console.log('Maximum files per day value changed successfully');
}
exports.changeMaxFilesPerDay = changeMaxFilesPerDay;
/**
 * Sends a forbidden response to a request (typically when a signature expires)
 * @function
 * @param res The response object
 * @returns {boolean} Whether the file was successfully sent or an error occurred
 */
function sendForbidden(res) {
    try {
        res.set('Content-Type', 'image/jpeg');
        res.status(200).sendFile(path_1.default.resolve(`./views/403.jpg`), (err) => {
            if (err) {
                if (process.env.NODE_ENV && process.env.NODE_ENV === 'development')
                    console.log(err);
                res.status(500).end();
            }
        });
        return true;
    }
    catch (err) {
        console.log(err);
        return false;
    }
}
exports.sendForbidden = sendForbidden;
/**
 * Gets the HTTP protocol based on the presence of a TLS certificate
 * @function
 * @returns {'http' | 'https'} The URL protocol
 */
function getURLProtocol() {
    if (process.env.TLS_CERT && process.env.TLS_KEY) {
        return 'https';
    }
    else {
        return 'http';
    }
}
exports.getURLProtocol = getURLProtocol;
/**
 * Gets the port in the URL syntax
 *
 * Returns `''` if the port is either `80` or `443`, as modern browsers omit the port if it is one of those two
 * @function
 * @param port The port
 * @returns {'' | `:${number}`} The port in URL syntax or `''`, if `80` or '443'
 */
function getURLPort(port) {
    try {
        if (isInteger(port.toString())) {
            if (port === 80 || port === 443) {
                return '';
            }
            else {
                return `:${port}`;
            }
        }
        else {
            throw new Error('Invalid port number');
        }
    }
    catch (err) {
        throw err;
    }
}
exports.getURLPort = getURLPort;
