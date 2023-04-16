// Internal libs
import { Command } from '../utils/Structures';
import { changeHeadersTimeout, isInteger } from '../utils/Functions';

/**
 * Change headers timeout command
 * 
 * @command
 */
export default {
    name: 'change_headers_timeout',
    aliases: ['change_headerstimeout', 'headerstimeout', 'headers_timeout', 'headers'],
    async execute(args: string[]): Promise<void> {
        try {
            if (!args[0]) { console.log('You must provide the headers timeout value (in milliseconds)'); return; }
            if (!isInteger(args[0])) { console.log('The headers timeout value must be a positive integer'); return; }

            changeHeadersTimeout(parseInt(args[0]));
        } catch (err) {
            throw err;
        }
    }
} as Command