import { Client } from 'discord.js';

/**
 * @event
 * @param {Client} _client The bot's client
 * @param {{ timeout: number; limit: number; method: string; path: string; route: string; global: boolean }} rateLimitData Object containing the rate limit info
 * @returns {void}
 */
export default function (_client: Client, rateLimitData: { timeout: number; limit: number; method: string; path: string; route: string; global: boolean; }): void {
    console.warn(`I\'ve been rate limited\n${rateLimitData}`);
}