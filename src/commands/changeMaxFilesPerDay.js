"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Functions_1 = require("../utils/Functions");
/**
 * Change max files per day command
 *
 * @command
 */
exports.default = {
    name: 'change_max_files_per_day',
    aliases: ['change_maxfilesperday', 'max_files_per_day', 'maxfilesperday', 'per_day', 'perday'],
    async execute(args) {
        try {
            if (!args[0]) {
                console.log('You must provide the number of files per day');
                return;
            }
            if (!(0, Functions_1.isInteger)(args[0])) {
                console.log('The files per day value must be a positive integer');
                return;
            }
            (0, Functions_1.changeMaxFilesPerDay)(parseInt(args[0]));
        }
        catch (err) {
            throw err;
        }
    }
};
