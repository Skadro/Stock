// Internal libs
import { Command } from '../utils/Structures';
import { changeDir } from '../utils/Functions';

/**
 * Change dir command
 * 
 * @command
 */
export default {
    name: 'change_dir',
    aliases: ['change_root', 'change_rootdir', 'dir', 'root'],
    async execute(args: string[]): Promise<void> {
        try {
            if (!args[0]) { console.log('You must provide the directory name'); return; }

            changeDir(args[0]);
        } catch (err) {
            throw err;
        }
    }
} as Command