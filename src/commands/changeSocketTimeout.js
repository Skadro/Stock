"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Functions_1 = require("../utils/Functions");
/**
 * Change socket timeout command
 *
 * @command
 */
exports.default = {
    name: 'change_socket_timeout',
    aliases: ['change_sockettimeout', 'sockettimeout', 'socket_timeout', 'socket'],
    async execute(args) {
        try {
            if (!args[0]) {
                console.log('You must provide the socket timeout value (in milliseconds)');
                return;
            }
            if (!(0, Functions_1.isInteger)(args[0])) {
                console.log('The socket timeout value must be a positive integer');
                return;
            }
            (0, Functions_1.changeSocketTimeout)(parseInt(args[0]));
        }
        catch (err) {
            throw err;
        }
    }
};
