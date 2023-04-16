"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Functions_1 = require("../utils/Functions");
/**
 * Change request timeout command
 *
 * @command
 */
exports.default = {
    name: 'change_request_timeout',
    aliases: ['change_requesttimeout', 'requesttimeout', 'request_timeout', 'request'],
    async execute(args) {
        try {
            if (!args[0]) {
                console.log('You must provide the request timeout value (in milliseconds)');
                return;
            }
            if (!(0, Functions_1.isInteger)(args[0])) {
                console.log('The request timeout value must be a positive integer');
                return;
            }
            (0, Functions_1.changeRequestTimeout)(parseInt(args[0]));
        }
        catch (err) {
            throw err;
        }
    }
};
