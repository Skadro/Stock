"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// External libs
const express_1 = __importDefault(require("express"));
// Internal libs
const Storage_1 = require("../utils/Storage");
/**
 * Month router
 *
 * `/${config.config.server.rootDir}/:category/:year/:month`
 */
const router = express_1.default.Router({ caseSensitive: true });
router.get(`/${Storage_1.config.config.server.rootDir}/:category/:year/:month`, (_req, res) => {
    res.status(404).end();
});
exports.default = router;
