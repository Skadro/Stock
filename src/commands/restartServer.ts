// External libs
import express from 'express';

// Internal libs
import { Command } from '../utils/Structures';
import { server } from '../utils/Storage';
import { stopServer, serverSetup } from '../utils/Functions';

/**
 * Restart server command
 * 
 * @command
 */
export default {
    name: 'restart_server',
    aliases: ['restart', 'start'],
    async execute(): Promise<void> {
        try {
            if (server.app || server.server) stopServer();
            server.app = express();
            serverSetup();
        } catch (err) {
            throw err;
        }
    },
} as Command