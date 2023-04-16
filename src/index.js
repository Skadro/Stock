"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const Storage_1 = require("./utils/Storage");
const Functions_1 = require("./utils/Functions");
dotenv_1.default.config();
if (!process.env.NODE_ENV) {
    console.log('You must provide the NODE_ENV in .env');
    process.exit(0);
}
if (!(process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development')) {
    console.log('NODE_ENV must be either \"production\" or \"development\"');
    process.exit(0);
}
if (process.env.NODE_ENV === 'development') {
    process.on('uncaughtException', error => console.log(error));
    process.on('unhandledRejection', error => console.log(error));
}
(0, Functions_1.commandHandler)();
Storage_1.server.app = (0, express_1.default)();
(0, Functions_1.serverSetup)();
