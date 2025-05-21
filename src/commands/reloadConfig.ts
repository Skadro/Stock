// Internal libs
import { Command } from '../utils/Structures';
import { config } from '../utils/Storage';

/**
 * Reload config command
 * 
 * @command
 */
export default {
    name: 'reload_config',
    aliases: ['reload_cfg', 'reload', 'config', 'cfg'],
    async execute(): Promise<void> {
        try {
            config.reload();
            console.log('Config file reloaded');
        } catch (err) {
            throw err;
        }
    },
} as Command