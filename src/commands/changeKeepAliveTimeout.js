"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Functions_1 = require("../utils/Functions");
/**
 * Change keep-alive timeout command
 *
 * @command
 */
exports.default = {
    name: 'change_keep-alive_timeout',
    aliases: ['change_keepalive_timeout', 'keepalive_timeout', 'keepalive_timeout', 'keepalive', 'keep-alive'],
    async execute(args) {
        try {
            if (!args[0]) {
                console.log('You must provide the keep-alive timeout value (in milliseconds)');
                return;
            }
            if (!(0, Functions_1.isInteger)(args[0])) {
                console.log('The keep-alive timeout value must be a positive integer');
                return;
            }
            (0, Functions_1.changeKeepAliveTimeout)(parseInt(args[0]));
        }
        catch (err) {
            throw err;
        }
    }
};
