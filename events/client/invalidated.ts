import { Client } from 'discord.js';

/**
 * @event
 * @param {Client} client The bot's client
 * @returns {void}
 */
export default function (client: Client): void {
    console.log('The client\'s session became invalid');
    try {
        client.removeAllListeners();
        client.destroy();
        process.exit(0);
    } catch (err) {
        console.log(err);
        process.exit(0);
    }
}