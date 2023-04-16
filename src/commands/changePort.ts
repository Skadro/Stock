// Internal libs
import { Command } from '../utils/Structures';
import { changePort, isInteger } from '../utils/Functions';

/**
 * Change port command
 * 
 * @command
 */
export default {
    name: 'change_port',
    aliases: ['port'],
    async execute(args: string[]): Promise<void> {
        try {
            if (!args[0]) { console.log('You must provide the port'); return; }
            if (!isInteger(args[0])) { console.log('The port must be a positive integer'); return; }

            changePort(parseInt(args[0]));
        } catch (err) {
            throw err;
        }
    }
} as Command