"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Functions_1 = require("../utils/Functions");
/**
 * Add category command
 *
 * @command
 */
exports.default = {
    name: 'add_category',
    aliases: ['category'],
    async execute(args) {
        try {
            if (!args[0]) {
                console.log('You must provide the category name');
                return;
            }
            (0, Functions_1.addCategory)(args[0]);
        }
        catch (err) {
            throw err;
        }
    }
};
