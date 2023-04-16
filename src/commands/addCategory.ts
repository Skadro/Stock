// Internal libs
import { Command } from '../utils/Structures';
import { addCategory } from '../utils/Functions';

/**
 * Add category command
 * 
 * @command
 */
export default {
    name: 'add_category',
    aliases: ['category'],
    async execute(args: string[]): Promise<void> {
        try {
            if (!args[0]) { console.log('You must provide the category name'); return; }

            addCategory(args[0]);
        } catch (err) {
            throw err;
        }
    }
} as Command