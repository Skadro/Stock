"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Functions_1 = require("../utils/Functions");
/**
 * Change domain command
 *
 * @command
 */
exports.default = {
    name: 'change_domain',
    aliases: ['domain'],
    async execute(args) {
        try {
            if (!args[0]) {
                console.log('You must provide the domain name');
                return;
            }
            (0, Functions_1.changeDomain)(args[0]);
        }
        catch (err) {
            throw err;
        }
    }
};
