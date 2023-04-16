// Internal libs
import { Command } from '../utils/Structures';
import { stopServer } from '../utils/Functions';

/**
 * Shutdown command
 * 
 * @command
 */
export default {
    name: 'shutdown',
    aliases: ['stop'],
    async execute(): Promise<void> {
        try {
            stopServer();

            process.exit(0);
        } catch {
            process.exit(0);
        }
    },
} as Command