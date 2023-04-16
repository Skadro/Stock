// Internal libs
import { Command } from '../utils/Structures';
import { changeKeepAliveTimeout, isInteger } from '../utils/Functions';

/**
 * Change keep-alive timeout command
 * 
 * @command
 */
export default {
    name: 'change_keep-alive_timeout',
    aliases: ['change_keepalive_timeout', 'keepalive_timeout', 'keepalive_timeout', 'keepalive', 'keep-alive'],
    async execute(args: string[]): Promise<void> {
        try {
            if (!args[0]) { console.log('You must provide the keep-alive timeout value (in milliseconds)'); return; }
            if (!isInteger(args[0])) { console.log('The keep-alive timeout value must be a positive integer'); return; }

            changeKeepAliveTimeout(parseInt(args[0]));
        } catch (err) {
            throw err;
        }
    }
} as Command