"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Functions_1 = require("../utils/Functions");
/**
 * Shutdown command
 *
 * @command
 */
exports.default = {
    name: 'shutdown',
    aliases: ['stop'],
    async execute() {
        try {
            (0, Functions_1.stopServer)();
            process.exit(0);
        }
        catch {
            process.exit(0);
        }
    },
};
