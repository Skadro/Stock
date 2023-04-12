"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// External libs
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const querystring_1 = require("querystring");
// Internal libs
const Storage_1 = require("../utils/Storage");
const Functions_1 = require("../utils/Functions");
/**
 * Category router
 *
 * `/${config.config.server.rootDir}/:category`
 */
const router = express_1.default.Router({ caseSensitive: true });
router.get(`/${Storage_1.config.config.server.rootDir}/:category`, async (req, res) => {
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
        switch (req.params.category) {
            case 'createtoday':
                try {
                    await (0, Functions_1.createDate)((0, Functions_1.formatDate)(new Date(Date.now()))).then((i) => {
                        if (parseInt(i) > 0) {
                            res.status(200).send(`Created today\'s folders for ${i} category(-ies)`).end();
                            Storage_1.config.reload();
                        }
                        else {
                            res.status(404).end();
                        }
                    }).catch((err) => {
                        console.log(err);
                        res.status(500).end();
                    });
                }
                catch (err) {
                    console.log(err);
                    res.status(500).end();
                }
                break;
            case 'oembed':
                if (req.query.url) {
                    const pathParts = (0, querystring_1.unescape)(req.query.url.toString()).split('/');
                    pathParts.splice(0, 3);
                    if (pathParts.length !== 6) {
                        res.status(404).end();
                        return;
                    }
                    const fullPath = path_1.default.resolve(`./${pathParts[0]}/${pathParts[1]}/${pathParts[2]}/${pathParts[3]}/${pathParts[4]}/${pathParts[5]}`);
                    if (!fs_1.default.existsSync(fullPath)) {
                        res.status(404).end();
                        return;
                    }
                    if (/^\.(apng|avif|bmp|gif|ico|jpe|jpeg|jpg|png|webp)$/i.test(path_1.default.parse(fullPath).ext)) {
                        (0, fluent_ffmpeg_1.default)(fullPath).ffprobe((err, data) => {
                            if (err) {
                                if (process.env.NODE_ENV && process.env.NODE_ENV === 'development')
                                    console.log(err);
                                res.status(500).end();
                                return;
                            }
                            if (data.streams[0]) {
                                if (data.streams[0].width && data.streams[0].height) {
                                    const signature = (0, Functions_1.generateSignature)(`${Date.now()}|${path_1.default.parse(fullPath).base}`, Buffer.from(fs_1.default.readFileSync(path_1.default.resolve('./signature/key'), 'utf8'), 'hex'));
                                    if (!signature) {
                                        res.status(404).end();
                                        return;
                                    }
                                    const oEmbedObject = {
                                        'version': '1.0',
                                        'type': 'photo',
                                        'width': data.streams[0].width,
                                        'height': data.streams[0].height,
                                        'title': path_1.default.parse(fullPath).base,
                                        'url': `${(0, Functions_1.getURLProtocol)()}://${Storage_1.config.config.server.domain}${(0, Functions_1.getURLPort)(Storage_1.config.config.server.port)}/${pathParts[0]}/${pathParts[1]}/${pathParts[2]}/${pathParts[3]}/${pathParts[4]}/${pathParts[5]}?source=1&signature=${signature.signature}&iv=${signature.iv}`,
                                        'provider_name': `${pathParts[4]}/${pathParts[3]}/${pathParts[2]} stock`,
                                        'provider_url': `${(0, Functions_1.getURLProtocol)()}://${Storage_1.config.config.server.domain}${(0, Functions_1.getURLPort)(Storage_1.config.config.server.port)}/${pathParts[0]}/${pathParts[1]}/${pathParts[2]}/${pathParts[3]}/${pathParts[4]}`,
                                        'cache_age': 0
                                    };
                                    res.set('Content-Type', 'application/json');
                                    res.json(oEmbedObject);
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
                    else if (/^\.(mp4|webm)$/i.test(path_1.default.parse(fullPath).ext)) {
                        (0, fluent_ffmpeg_1.default)(fullPath).ffprobe((err, data) => {
                            if (err) {
                                if (process.env.NODE_ENV && process.env.NODE_ENV === 'development')
                                    console.log(err);
                                res.status(500).end();
                                return;
                            }
                            if (data.streams[0]) {
                                if (data.streams[0].width && data.streams[0].height) {
                                    const signature = (0, Functions_1.generateSignature)(`${Date.now()}|${path_1.default.parse(fullPath).base}`, Buffer.from(fs_1.default.readFileSync(path_1.default.resolve('./signature/key'), 'utf8'), 'hex'));
                                    if (!signature) {
                                        res.status(404).end();
                                        return;
                                    }
                                    const oEmbedObject = {
                                        'version': '1.0',
                                        'type': 'video',
                                        'width': data.streams[0].width,
                                        'height': data.streams[0].height,
                                        'title': path_1.default.parse(fullPath).base,
                                        'url': `${(0, Functions_1.getURLProtocol)()}://${Storage_1.config.config.server.domain}${(0, Functions_1.getURLPort)(Storage_1.config.config.server.port)}/${pathParts[0]}/${pathParts[1]}/${pathParts[2]}/${pathParts[3]}/${pathParts[4]}/${pathParts[5]}?source=1&signature=${signature.signature}&iv=${signature.iv}`,
                                        'provider_name': `Stock ${pathParts[4]}/${pathParts[3]}/${pathParts[2]}`,
                                        'provider_url': `${(0, Functions_1.getURLProtocol)()}://${Storage_1.config.config.server.domain}${(0, Functions_1.getURLPort)(Storage_1.config.config.server.port)}/${pathParts[0]}/${pathParts[1]}/${pathParts[2]}/${pathParts[3]}/${pathParts[4]}`,
                                        'cache_age': 0
                                    };
                                    res.set('Content-Type', 'application/json');
                                    res.json(oEmbedObject);
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
                else {
                    res.status(404).end();
                }
                break;
            default:
                res.status(404).end();
                break;
        }
    }
    catch (err) {
        console.log(err);
        res.status(500).end();
    }
});
exports.default = router;
