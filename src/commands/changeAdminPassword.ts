// Internal libs
import { Command } from '../utils/Structures';
import { changeAdminPassword } from '../utils/Functions';

/**
 * Change admin password command
 * 
 * @command
 */
export default {
    name: 'change_admin_password',
    aliases: ['change_adminpassword', 'change_password', 'password', 'adminpassword', 'admin_password'],
    async execute(args: string[]): Promise<void> {
        try {
            if (args.length === 0) { console.log('You must provide the admin password'); return; }

            changeAdminPassword(args.join(''));
        } catch (err) {
            throw err;
        }
    }
} as Command