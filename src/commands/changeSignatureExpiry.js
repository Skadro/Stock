"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Functions_1 = require("../utils/Functions");
/**
 * Change signature expiry command
 *
 * @command
 */
exports.default = {
    name: 'change_signature_expiry',
    aliases: ['change_sig_expiry', 'change_sigexpiry', 'sigexpiry', 'sig_expiry', 'signature', 'expiry'],
    async execute(args) {
        try {
            if (!args[0]) {
                console.log('You must provide the expiry time (in seconds)');
                return;
            }
            if (!(0, Functions_1.isInteger)(args[0])) {
                console.log('The expiry time must be a positive integer');
                return;
            }
            (0, Functions_1.changeSignatureExpiry)(parseInt(args[0]));
        }
        catch (err) {
            throw err;
        }
    }
};
