// Internal libs
import { Command } from '../utils/Structures';
import { generateKey } from '../utils/Functions';

/**
 * Generate key command
 * 
 * @command
 */
export default {
    name: 'generate_key',
    aliases: ['regenerate_key', 'key'],
    async execute(): Promise<void> {
        generateKey();
    },
} as Command