import { Client } from 'discord.js';

/**
 * @event
 * @param {Client} _client The bot's client
 * @param {Error} error The error encountered
 * @returns {void}
 */
export default function (_client: Client, error: Error): void {
    console.log(`Error:\n${error}`);
}