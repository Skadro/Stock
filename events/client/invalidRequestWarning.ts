import { Client } from 'discord.js';

/**
 * @event
 * @param {Client} _client The bot's client
 * @param {{ count: number, remainingTime: number }} invalidRequestWarningData Object containing the invalid request info
 * @returns {void}
 */
export default function (_client: Client, invalidRequestWarningData: { count: number; remainingTime: number }): void {
    console.log(`Invalid requests data:\n${invalidRequestWarningData}`);
}