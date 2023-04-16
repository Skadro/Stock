"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Functions_1 = require("../utils/Functions");
/**
 * Change files per page command
 *
 * @command
 */
exports.default = {
    name: 'change_files_per_page',
    aliases: ['change_filesperpage', 'files_per_page', 'filesperpage', 'pages'],
    async execute(args) {
        try {
            if (!args[0]) {
                console.log('You must provide the number of files per page');
                return;
            }
            if (!(0, Functions_1.isInteger)(args[0])) {
                console.log('The files per page value must be a positive integer');
                return;
            }
            (0, Functions_1.changeFilesPerPage)(parseInt(args[0]));
        }
        catch (err) {
            throw err;
        }
    }
};
