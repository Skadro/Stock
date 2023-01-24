import { Client } from 'discord.js';

/**
 * @event
 * @param {Client} _client The bot's client
 * @param {string} info The warning
 * @returns {void}
 */
export default function (_client: Client, info: string): void {
    console.log(`Warning:\n${info}`);
}