// Internal libs
import { Command } from '../utils/Structures';
import { changeSignatureExpiry, isInteger } from '../utils/Functions';

/**
 * Change signature expiry command
 * 
 * @command
 */
export default {
    name: 'change_signature_expiry',
    aliases: ['change_sig_expiry', 'change_sigexpiry', 'sigexpiry', 'sig_expiry', 'signature', 'expiry'],
    async execute(args: string[]): Promise<void> {
        try {
            if (!args[0]) { console.log('You must provide the expiry time (in seconds)'); return; }
            if (!isInteger(args[0])) { console.log('The expiry time must be a positive integer'); return; }

            changeSignatureExpiry(parseInt(args[0]));
        } catch (err) {
            throw err;
        }
    }
} as Command