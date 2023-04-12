"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// External libs
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const mime_1 = __importDefault(require("mime"));
// Internal libs
const Storage_1 = require("../utils/Storage");
const Functions_1 = require("../utils/Functions");
/**
 * Day router
 *
 * `/${config.config.server.rootDir}/:category/:year/:month/:day`
 */
const router = express_1.default.Router({ caseSensitive: true });
router.get(`/${Storage_1.config.config.server.rootDir}/:category/:year/:month/:day`, (req, res) => {
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
        const fullPath = path_1.default.resolve(`./${Storage_1.config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}`);
        if (!fs_1.default.existsSync(fullPath)) {
            res.status(404).end();
            return;
        }
        let files = fs_1.default.readdirSync(fullPath, 'utf8');
        if (files.length > Storage_1.config.config.maxFilesPerDay) {
            res.status(404).send('Max files per day exceeded').end();
            return;
        }
        let key = Buffer.from(fs_1.default.readFileSync(path_1.default.resolve('./signature/key'), 'utf8'), 'hex');
        try {
            files = files.filter((file) => fs_1.default.lstatSync(`${fullPath}/${file}`).isFile()).map((file) => {
                try {
                    let signature = (0, Functions_1.generateSignature)(`${Date.now()}|${path_1.default.parse(`${fullPath}/${file}`).base}`, key);
                    if (!signature) {
                        throw 'Invalid sig';
                    }
                    return {
                        url: `/${Storage_1.config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${file}`,
                        path: `/${Storage_1.config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${file}?source=1&signature=${signature.signature}&iv=${signature.iv}`, filename: path_1.default.parse(`${fullPath}/${file}`).base,
                        type: { mediaType: (/^\.(apng|avif|bmp|gif|ico|jpe|jpeg|jpg|png|webp)$/i.test(path_1.default.parse(`${req.params.day}/${file}`).ext)) ? 'image' : (/^\.(mp4|webm)$/i.test(path_1.default.parse(`${req.params.day}/${file}`).ext)) ? 'video' : null, contentType: mime_1.default.getType(path_1.default.parse(`${req.params.day}/${file}`).ext) }
                    };
                }
                catch (err) {
                    throw err;
                }
            }).filter((file) => file.type.mediaType && file.type.contentType);
        }
        catch (err) {
            files = [];
            if (err != 'Invalid sig') {
                throw err;
            }
        }
        if (files.length === 0) {
            res.status(404).send('No files available').end();
            return;
        }
        files.sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' }));
        const pages = Math.ceil(files.length / Storage_1.config.config.filesPerPage);
        if (req.query.page) {
            if (!Number.isNaN(Number(req.query.page)) && Number.isSafeInteger(Number(req.query.page))) {
                if ((Number(req.query.page) > pages) || (Number(req.query.page) < 1)) {
                    res.redirect(`${(0, Functions_1.getURLProtocol)()}://${Storage_1.config.config.server.domain}${(0, Functions_1.getURLPort)(Storage_1.config.config.server.port)}/${Storage_1.config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}`);
                    return;
                }
            }
            else {
                res.redirect(`${(0, Functions_1.getURLProtocol)()}://${Storage_1.config.config.server.domain}${(0, Functions_1.getURLPort)(Storage_1.config.config.server.port)}/${Storage_1.config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}`);
                return;
            }
        }
        res.status(200).render('index', {
            meta: {
                pageTitle: `Page ${(req.query.page) ? req.query.page : '1'} - ${req.params.day}/${req.params.month}/${req.params.year} stock`,
                title: `Stock`,
                date: `${req.params.day}/${req.params.month}/${req.params.year}`,
                description: `The ${req.params.day}/${req.params.month}/${req.params.year} stock with ${(files.length === 1) ? `1 file` : `${files.length} files`} is available now`,
                siteName: 'Gu Stock',
                url: `${(0, Functions_1.getURLProtocol)()}://${Storage_1.config.config.server.domain}${(0, Functions_1.getURLPort)(Storage_1.config.config.server.port)}/${Storage_1.config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}`
            },
            stylesheet: `/${Storage_1.config.config.server.rootDir}/views/index.css`,
            favicon: `/${Storage_1.config.config.server.rootDir}/views/favicon.ico`,
            files: files,
            filesPerPage: Storage_1.config.config.filesPerPage,
            page: req.query.page || 1
        }, (err, html) => {
            if (err) {
                if (process.env.NODE_ENV && process.env.NODE_ENV === 'development')
                    console.log(err);
                res.status(500).end();
                return;
            }
            if (html)
                res.status(200).send(html);
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).end();
    }
});
exports.default = router;
