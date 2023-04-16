// Internal libs
import { Command } from '../utils/Structures';
import { changeDomain } from '../utils/Functions';

/**
 * Change domain command
 * 
 * @command
 */
export default {
    name: 'change_domain',
    aliases: ['domain'],
    async execute(args: string[]): Promise<void> {
        try {
            if (!args[0]) { console.log('You must provide the domain name'); return; }

            changeDomain(args[0]);
        } catch (err) {
            throw err;
        }
    }
} as Command