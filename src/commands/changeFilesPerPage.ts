// Internal libs
import { Command } from '../utils/Structures';
import { changeFilesPerPage, isInteger } from '../utils/Functions';

/**
 * Change files per page command
 * 
 * @command
 */
export default {
    name: 'change_files_per_page',
    aliases: ['change_filesperpage', 'files_per_page', 'filesperpage', 'pages'],
    async execute(args: string[]): Promise<void> {
        try {
            if (!args[0]) { console.log('You must provide the number of files per page'); return; }
            if (!isInteger(args[0])) { console.log('The files per page value must be a positive integer'); return; }

            changeFilesPerPage(parseInt(args[0]));
        } catch (err) {
            throw err;
        }
    }
} as Command