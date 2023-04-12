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
 * Root router
 *
 * `/`
 *
 * `/${config.config.server.rootDir}`
 */
const router = express_1.default.Router({ caseSensitive: true });
router.get('/', (_req, res) => {
    res.status(404).end();
});
router.get(`/${Storage_1.config.config.server.rootDir}`, (_req, res) => {
    res.status(404).end();
});
exports.default = router;
