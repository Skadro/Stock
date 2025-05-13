// External libs
import path from 'path';

// Internal libs
import { Command, Config, Server } from './Structures';

export const config: Config = new Config(path.resolve('./config.json'));
export const server: Server = { app: undefined, server: undefined, database: undefined };
export const commands: Map<string[], Command> = new Map<string[], Command>();
export const mediaRegEx: { image: RegExp, video: RegExp } = { image: /^\.(apng|avif|bmp|gif|ico|jpe|jpeg|jpg|png|webp)$/i, video: /^\.(mp4|webm)$/i };