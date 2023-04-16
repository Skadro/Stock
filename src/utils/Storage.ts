// External libs
import path from 'path';

// Internal libs
import { Command, Config, Server } from './Structures';

export const config: Config = new Config(path.resolve('./config.json'));
export const server: Server = { app: undefined, server: undefined };
export const commands: Map<string[], Command> = new Map<string[], Command>();