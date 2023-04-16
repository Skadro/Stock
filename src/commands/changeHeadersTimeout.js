"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Functions_1 = require("../utils/Functions");
/**
 * Change headers timeout command
 *
 * @command
 */
exports.default = {
    name: 'change_headers_timeout',
    aliases: ['change_headerstimeout', 'headerstimeout', 'headers_timeout', 'headers'],
    async execute(args) {
        try {
            if (!args[0]) {
                console.log('You must provide the headers timeout value (in milliseconds)');
                return;
            }
            if (!(0, Functions_1.isInteger)(args[0])) {
                console.log('The headers timeout value must be a positive integer');
                return;
            }
            (0, Functions_1.changeHeadersTimeout)(parseInt(args[0]));
        }
        catch (err) {
            throw err;
        }
    }
};
