"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Storage_1 = require("../utils/Storage");
/**
 * Get connections command
 *
 * @command
 */
exports.default = {
    name: 'get_connections',
    aliases: ['connections'],
    async execute() {
        try {
            if (Storage_1.server.server) {
                Storage_1.server.server.getConnections((err, count) => {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    console.log(`Current connections: ${count}`);
                });
            }
        }
        catch (err) {
            throw err;
        }
    },
};
