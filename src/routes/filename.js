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
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const querystring_1 = require("querystring");
// Internal libs
const Storage_1 = require("../utils/Storage");
const Functions_1 = require("../utils/Functions");
/**
 * Filename router
 *
 * `/${config.config.server.rootDir}/:category/:year/:month/:day/:filename`
 */
const router = express_1.default.Router({ caseSensitive: true });
router.get(`/${Storage_1.config.config.server.rootDir}/:category/:year/:month/:day/:filename`, (req, res) => {
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
        const fullPath = path_1.default.resolve(`./${Storage_1.config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${req.params.filename}`);
        if (!fs_1.default.existsSync(fullPath)) {
            if (req.query.source && req.query.source.toString() === '1') {
                (0, Functions_1.sendForbidden)(res);
                return;
            }
            res.status(404).end();
            return;
        }
        const type = mime_1.default.getType(path_1.default.parse(fullPath).ext);
        const mediaType = (/^\.(apng|avif|bmp|gif|ico|jpe|jpeg|jpg|png|webp)$/i.test(path_1.default.parse(fullPath).ext)) ? 'image' : (/^\.(mp4|webm)$/i.test(path_1.default.parse(fullPath).ext)) ? 'video' : null;
        if (type && mediaType) {
            (0, fluent_ffmpeg_1.default)(fullPath).ffprobe((err, data) => {
                if (err) {
                    if (process.env.NODE_ENV && process.env.NODE_ENV === 'development')
                        console.log(err);
                    res.status(500).end();
                    return;
                }
                if (data.streams[0]) {
                    if (data.streams[0].width && data.streams[0].height) {
                        if (req.query.source && req.query.source.toString() === '1') {
                            if (req.query.signature && req.query.iv) {
                                let decryptedSignature = (0, Functions_1.decryptSignature)((0, querystring_1.unescape)(req.query.signature.toString()), Buffer.from(fs_1.default.readFileSync(path_1.default.resolve('./signature/key'), 'utf8'), 'hex'), (0, querystring_1.unescape)(req.query.iv.toString()));
                                if (!decryptedSignature) {
                                    (0, Functions_1.sendForbidden)(res);
                                    return;
                                }
                                const signatureParts = decryptedSignature.split('|');
                                if (signatureParts.length !== 2) {
                                    (0, Functions_1.sendForbidden)(res);
                                    return;
                                }
                                if (!signatureParts[0] || !signatureParts[1]) {
                                    (0, Functions_1.sendForbidden)(res);
                                    return;
                                }
                                if ((0, Functions_1.isInteger)(signatureParts[0]) && (0, Functions_1.checkDifference)(signatureParts[0], Storage_1.config.config.server.signatureExpiry) && signatureParts[1] === path_1.default.parse(fullPath).base) {
                                    res.set('Content-Type', type);
                                    res.status(200).sendFile(fullPath, (err) => {
                                        if (err) {
                                            if (process.env.NODE_ENV && process.env.NODE_ENV === 'development')
                                                console.log(err);
                                            res.status(500).end();
                                        }
                                    });
                                }
                                else {
                                    (0, Functions_1.sendForbidden)(res);
                                    return;
                                }
                            }
                            else {
                                (0, Functions_1.sendForbidden)(res);
                                return;
                            }
                        }
                        else {
                            const url = `${(0, Functions_1.getURLProtocol)()}://${Storage_1.config.config.server.domain}${(0, Functions_1.getURLPort)(Storage_1.config.config.server.port)}/${Storage_1.config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${req.params.filename}`;
                            if (req.query.signature || req.query.iv) {
                                res.redirect(`${url}`);
                                return;
                            }
                            let signature = (0, Functions_1.generateSignature)(`${Date.now()}|${path_1.default.parse(fullPath).base}`, Buffer.from(fs_1.default.readFileSync(path_1.default.resolve('./signature/key'), 'utf8'), 'hex'));
                            if (!signature) {
                                res.status(500).end();
                                return;
                            }
                            res.status(200).render('media', {
                                meta: {
                                    title: `${req.params.filename} (${data.streams[0].width}x${data.streams[0].height})`,
                                    filename: req.params.filename,
                                    mediaType: mediaType,
                                    contentType: type,
                                    width: data.streams[0].width,
                                    height: data.streams[0].height,
                                    url: url,
                                    mediaURL: `${url}?source=1&signature=${(0, querystring_1.escape)(signature.signature)}&iv=${(0, querystring_1.escape)(signature.iv)}`,
                                    oEmbed: `${(0, Functions_1.getURLProtocol)()}://${Storage_1.config.config.server.domain}${(0, Functions_1.getURLPort)(Storage_1.config.config.server.port)}/${Storage_1.config.config.server.rootDir}/oembed?url=${(0, querystring_1.escape)(url)}`
                                },
                                stylesheet: `/${Storage_1.config.config.server.rootDir}/views/media.css`,
                                favicon: `/${Storage_1.config.config.server.rootDir}/views/favicon.ico`,
                                zoomScript: `/${Storage_1.config.config.server.rootDir}/views/zoom.js`,
                                secured: process.env.TLS_CERT && process.env.TLS_KEY
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
                    }
                    else {
                        res.status(404).end();
                    }
                }
                else {
                    res.status(404).end();
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
router.get(`/${Storage_1.config.config.server.rootDir}/:category/:year/:month/:day/:filename/*`, (_req, res) => {
    res.status(404).end();
});
exports.default = router;
