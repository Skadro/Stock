"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// External libs
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Internal libs
const Storage_1 = require("../utils/Storage");
/**
 * Year router
 *
 * `/${config.config.server.rootDir}/:category/:year`
 */
const router = express_1.default.Router({ caseSensitive: true });
router.get(`/${Storage_1.config.config.server.rootDir}/:category/:year`, (req, res) => {
    try {
        req.on('error', (err) => {
            if (process.env.NODE_ENV && process.env.NODE_ENV === 'development')
                console.log(err);
            res.status(500).end();
        });
        res.on('error', (err) => {
            if (process.env.NODE_ENV && process.env.NODE_ENV === 'development')
                console.log(err);
            res.status(500).end();
        });
        const fullPath = path_1.default.resolve(`./views/${req.params.year}`);
        const filename = path_1.default.parse(fullPath).base;
        if (fs_1.default.existsSync(fullPath) && (filename === 'index.css' || filename === 'media.css' || filename === 'zoom.js' || filename === 'favicon.ico')) {
            res.status(200).sendFile(fullPath, (err) => {
                if (err) {
                    if (process.env.NODE_ENV && process.env.NODE_ENV === 'development')
                        console.log(err);
                    res.status(500).end();
                }
            });
        }
        else {
            res.status(404).end();
        }
    }
    catch (err) {
        console.log(err);
        res.status(500).end();
    }
});
exports.default = router;
