// Internal libs
import { Command } from '../utils/Structures';
import { changeSocketTimeout, isInteger } from '../utils/Functions';

/**
 * Change socket timeout command
 * 
 * @command
 */
export default {
    name: 'change_socket_timeout',
    aliases: ['change_sockettimeout', 'sockettimeout', 'socket_timeout', 'socket'],
    async execute(args: string[]): Promise<void> {
        try {
            if (!args[0]) { console.log('You must provide the socket timeout value (in milliseconds)'); return; }
            if (!isInteger(args[0])) { console.log('The socket timeout value must be a positive integer'); return; }

            changeSocketTimeout(parseInt(args[0]));
        } catch (err) {
            throw err;
        }
    }
} as Command