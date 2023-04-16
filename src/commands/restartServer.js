"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// External libs
const express_1 = __importDefault(require("express"));
const Storage_1 = require("../utils/Storage");
const Functions_1 = require("../utils/Functions");
/**
 * Restart server command
 *
 * @command
 */
exports.default = {
    name: 'restart_server',
    aliases: ['restart', 'start'],
    async execute() {
        try {
            if (Storage_1.server.app || Storage_1.server.server)
                (0, Functions_1.stopServer)();
            Storage_1.server.app = (0, express_1.default)();
            (0, Functions_1.serverSetup)();
        }
        catch (err) {
            throw err;
        }
    },
};
