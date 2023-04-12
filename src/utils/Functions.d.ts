/// <reference types="node" />
import { Response } from 'express';
import { EncryptedSignature, FormattedDate } from './Structures';
/**
 * A command prompt within the application that can be used to perform a variety of tasks
 * @function
 * @returns {Promise<void>}
 */
export declare function commandPrompt(): Promise<void>;
/**
 * A date formatter that is used when creating stock directories
 * @function
 * @param date A `Date` instance
 * @returns {FormattedDate} the formatted date
 */
export declare function formatDate(date: Date): FormattedDate;
/**
 * Creates the directories for the stock based on the given `FormattedDate` parameter
 * @function
 * @param date Formatted date
 * @returns {Promise<string>} A promise resolving the number of created folders
 */
export declare function createDate(date: FormattedDate): Promise<string>;
/**
 * Checks if a string is a positive integer
 * @function
 * @param text The string to be checked
 * @returns {boolean} Whether `text` is a positive integer
 */
export declare function isInteger(text: string): boolean;
/**
 * Generates the AES key (for the signatures)
 * @function
 * @returns {void}
 */
export declare function generateKey(): void;
/**
 * Encrypts signatures
 * @function
 * @param query The string to encrypt
 * @param secret The decryption key
 * @returns {EncryptedSignature | null} An object containing the `initialization vector` and the `encrypted string` or `null`, in case of an error
 */
export declare function generateSignature(query: string, secret: Buffer): EncryptedSignature | null;
/**
 * Decrypts signatures
 * @function
 * @param encryptedQuery The encrypted string
 * @param secret The decryption key
 * @param iv The initialization vector
 * @returns {string | null} The `decrypted string` or `null`, in case of an error
 */
export declare function decryptSignature(encryptedQuery: string, secret: Buffer, iv: string): string | null;
/**
 * Checks the difference between a given time and the current time
 * @function
 * @param time The time (in seconds)
 * @param maxDifference The maximum required difference between `Date.now()` and `time`
 * @returns {boolean} Whether the difference between `Date.now()` and `time` is less than or equal to `maxDifference`
 */
export declare function checkDifference(time: string | number, maxDifference: number): boolean;
/**
 * Setups the server and the Express routes
 * @function
 * @returns {void}
 */
export declare function serverSetup(): void;
/**
 * Closes all connections and stops the server
 * @function
 * @returns {void}
 */
export declare function stopServer(): void;
/**
 * Adds a category to config
 * @function
 * @param name The category's name
 * @returns {void}
 */
export declare function addCategory(name: string): void;
/**
 * Changes the domain name for the server
 * @function
 * @param domain The new domain name
 * @returns {void}
 */
export declare function changeDomain(domain: string): void;
/**
 * Changes the port for the server
 * @function
 * @param port The new port
 * @returns {void}
 */
export declare function changePort(port: number): void;
/**
 * Changes the root directory of the server
 * @function
 * @param dirName The new directory name
 * @returns {void}
 */
export declare function changeDir(dirName: string): void;
/**
 * Changes the server's `socket` timeout
 * @function
 * @param timeout The new `socket` timeout
 * @returns {void}
 */
export declare function changeSocketTimeout(timeout: number): void;
/**
 * Changes the server's `keep-alive` timeout
 * @function
 * @param timeout The new `keep-alive` timeout
 * @returns {void}
 */
export declare function changeKeepAliveTimeout(timeout: number): void;
/**
 * Changes the server's `request` timeout
 * @function
 * @param timeout The new `request` timeout
 * @returns {void}
 */
export declare function changeRequestTimeout(timeout: number): void;
/**
 * Changes the server's `headers` timeout
 * @function
 * @param timeout The new `headers` timeout
 * @returns {void}
 */
export declare function changeHeadersTimeout(timeout: number): void;
/**
 * Changes the expiration time of the signatures
 * @function
 * @param expiry The new expiry time
 * @return {void}
 */
export declare function changeSignatureExpiry(expiry: number): void;
/**
 * Changes the number of files per page
 * @function
 * @param filesPerPage The new `files per day` value
 * @returns {void}
 */
export declare function changeFilesPerPage(filesPerPage: number): void;
/**
 * Changes the maximum number of files per day
 * @function
 * @param maxFilesPerDay The new `max files per day` value
 * @returns {void}
 */
export declare function changeMaxFilesPerDay(maxFilesPerDay: number): void;
/**
 * Sends a forbidden response to a request (typically when a signature expires)
 * @function
 * @param res The response object
 * @returns {boolean} Whether the file was successfully sent or an error occurred
 */
export declare function sendForbidden(res: Response): boolean;
/**
 * Gets the HTTP protocol based on the presence of a TLS certificate
 * @function
 * @returns {'http' | 'https'} The URL protocol
 */
export declare function getURLProtocol(): 'http' | 'https';
/**
 * Gets the port in the URL syntax
 *
 * Returns `''` if the port is either `80` or `443`, as modern browsers omit the port if it is one of those two
 * @function
 * @param port The port
 * @returns {'' | `:${number}`} The port in URL syntax or `''`, if `80` or '443'
 */
export declare function getURLPort(port: number): '' | `:${number}`;
//# sourceMappingURL=Functions.d.ts.map