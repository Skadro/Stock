// Internal libs
import { Command } from '../utils/Structures';
import { changeMaxFilesPerDay, isInteger } from '../utils/Functions';

/**
 * Change max files per day command
 * 
 * @command
 */
export default {
    name: 'change_max_files_per_day',
    aliases: ['change_maxfilesperday', 'max_files_per_day', 'maxfilesperday', 'per_day', 'perday'],
    async execute(args: string[]): Promise<void> {
        try {
            if (!args[0]) { console.log('You must provide the number of files per day'); return; }
            if (!isInteger(args[0])) { console.log('The files per day value must be a positive integer'); return; }

            changeMaxFilesPerDay(parseInt(args[0]));
        } catch (err) {
            throw err;
        }
    }
} as Command