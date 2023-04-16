// Internal libs
import { Command } from '../utils/Structures';
import { changeRequestTimeout, isInteger } from '../utils/Functions';

/**
 * Change request timeout command
 * 
 * @command
 */
export default {
    name: 'change_request_timeout',
    aliases: ['change_requesttimeout', 'requesttimeout', 'request_timeout', 'request'],
    async execute(args: string[]): Promise<void> {
        try {
            if (!args[0]) { console.log('You must provide the request timeout value (in milliseconds)'); return; }
            if (!isInteger(args[0])) { console.log('The request timeout value must be a positive integer'); return; }

            changeRequestTimeout(parseInt(args[0]));
        } catch (err) {
            throw err;
        }
    }
} as Command