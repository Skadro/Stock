"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Functions_1 = require("../utils/Functions");
/**
 * Generate key command
 *
 * @command
 */
exports.default = {
    name: 'generate_key',
    aliases: ['regenerate_key', 'key'],
    async execute() {
        (0, Functions_1.generateKey)();
    },
};
