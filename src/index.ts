import dotenv from 'dotenv';
import express from 'express';

import { server } from './utils/Storage';
import { serverSetup } from './utils/Functions';

dotenv.config();

if (!process.env.NODE_ENV) { console.log('You must provide the NODE_ENV in .env'); process.exit(0); }
if (!(process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development')) { console.log('NODE_ENV must be either \"production\" or \"development\"'); process.exit(0); }

if (process.env.NODE_ENV === 'development') {
    process.on('uncaughtException', error => console.log(error));
    process.on('unhandledRejection', error => console.log(error));
}

server.app = express();
serverSetup();