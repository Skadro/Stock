"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Functions_1 = require("../utils/Functions");
/**
 * Change dir command
 *
 * @command
 */
exports.default = {
    name: 'change_dir',
    aliases: ['change_root', 'change_rootdir', 'dir', 'root'],
    async execute(args) {
        try {
            if (!args[0]) {
                console.log('You must provide the directory name');
                return;
            }
            (0, Functions_1.changeDir)(args[0]);
        }
        catch (err) {
            throw err;
        }
    }
};
