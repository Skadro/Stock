// Internal libs
import { Command } from '../utils/Structures';
import { config } from '../utils/Storage';
import { createDate, formatDate } from '../utils/Functions';

/**
 * Create today command
 * 
 * @command
 */
export default {
    name: 'create_today',
    aliases: ['createtoday', 'today'],
    async execute(): Promise<void> {
        try {
            await createDate(formatDate(new Date(Date.now()))).then((i) => {
                console.log(`Created today\'s folders for ${i} category(-ies)`);
                config.reload();
            }).catch((err) => {
                console.log(err);
            });
        } catch (err) {
            throw err;
        }
    },
} as Command