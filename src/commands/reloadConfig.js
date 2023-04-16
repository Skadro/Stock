"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Storage_1 = require("../utils/Storage");
/**
 * Reload config command
 *
 * @command
 */
exports.default = {
    name: 'reload_config',
    aliases: ['reload_cfg', 'reload', 'config', 'cfg'],
    async execute() {
        try {
            Storage_1.config.reload();
        }
        catch (err) {
            throw err;
        }
    },
};
