import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { eventHandler, serverSetup } from './utils/Functions';

process.on('uncaughtException', error => console.log(error));
process.on('unhandledRejection', error => console.log(error));

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
const app = express();

if (!process.env.LOGIN_TOKEN || !process.env.CLIENT_ID) { console.error('Invalid .env config'); process.exit(0); }

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildBans, GatewayIntentBits.GuildEmojisAndStickers, GatewayIntentBits.GuildIntegrations, GatewayIntentBits.GuildWebhooks, GatewayIntentBits.GuildInvites, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMessageTyping, GatewayIntentBits.DirectMessages, GatewayIntentBits.DirectMessageReactions, GatewayIntentBits.DirectMessageTyping, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildScheduledEvents],
    partials: [Partials.User, Partials.Channel, Partials.GuildMember, Partials.Message, Partials.Reaction, Partials.GuildScheduledEvent, Partials.ThreadMember],
    allowedMentions: { parse: ['everyone', 'users', 'roles'], repliedUser: true }
});

eventHandler(client);
serverSetup(client, app);

client.login(process.env.LOGIN_TOKEN);