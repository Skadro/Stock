// Internal libs
import { Command } from '../utils/Structures';
import { server } from '../utils/Storage';

/**
 * Get connections command
 * 
 * @command
 */
export default {
    name: 'get_connections',
    aliases: ['connections'],
    async execute(): Promise<void> {
        try {
            if (server.server) {
                server.server.getConnections((err: Error | null, count: number) => {
                    if (err) {
                        console.log(err);
                        return;
                    }

                    console.log(`Current connections: ${count}`);
                });
            }
        } catch (err) {
            throw err;
        }
    },
} as Command