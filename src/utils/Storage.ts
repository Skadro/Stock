// External libs
import path from 'path';

// Internal libs
import { Config, Server } from './Structures';

export const config: Config = new Config(path.resolve('./config.json'));
export const server: Server = { app: undefined, server: undefined };