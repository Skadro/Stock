"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Storage_1 = require("../utils/Storage");
const Functions_1 = require("../utils/Functions");
/**
 * Create today command
 *
 * @command
 */
exports.default = {
    name: 'create_today',
    aliases: ['createtoday', 'today'],
    async execute() {
        try {
            await (0, Functions_1.createDate)((0, Functions_1.formatDate)(new Date(Date.now()))).then((i) => {
                console.log(`Created today\'s folders for ${i} category(-ies)`);
                Storage_1.config.reload();
            }).catch((err) => {
                console.log(err);
            });
        }
        catch (err) {
            throw err;
        }
    },
};
