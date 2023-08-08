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
    aliases: ['addcategory', 'category'],
    async execute(args: string[]): Promise<void> {
        try {
            if (args.length === 0) { console.log('You must provide the category name'); return; }

            addCategory(args.join(''));
        } catch (err) {
            throw err;
        }
    }
} as Command