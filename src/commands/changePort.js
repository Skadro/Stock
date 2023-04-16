"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Functions_1 = require("../utils/Functions");
/**
 * Change port command
 *
 * @command
 */
exports.default = {
    name: 'change_port',
    aliases: ['port'],
    async execute(args) {
        try {
            if (!args[0]) {
                console.log('You must provide the port');
                return;
            }
            if (!(0, Functions_1.isInteger)(args[0])) {
                console.log('The port must be a positive integer');
                return;
            }
            (0, Functions_1.changePort)(parseInt(args[0]));
        }
        catch (err) {
            throw err;
        }
    }
};
