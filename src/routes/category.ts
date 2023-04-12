// External libs
import express, { Router } from 'express';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { unescape } from 'querystring';

// Internal libs
import { config } from '../utils/Storage';
import { createDate, formatDate, generateSignature, getURLPort, getURLProtocol } from '../utils/Functions';

/**
 * Category router
 * 
 * `/${config.config.server.rootDir}/:category`
 */
const router: Router = express.Router({ caseSensitive: true });

router.get(`/${config.config.server.rootDir}/:category`, async (req, res) => {
    try {
        req.on('error', (err) => {
            if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
            res.status(500).end();
        });

        res.on('error', (err) => {
            if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
            res.status(500).end();
        });

        switch (req.params.category) {
            case 'createtoday':
                try {
                    await createDate(formatDate(new Date(Date.now()))).then((i) => {
                        if (parseInt(i) > 0) {
                            res.status(200).send(`Created today\'s folders for ${i} category(-ies)`).end();
                            config.reload();
                        } else {
                            res.status(404).end();
                        }
                    }).catch((err) => {
                        console.log(err);
                        res.status(500).end();
                    });
                } catch (err) {
                    console.log(err);
                    res.status(500).end();
                }

                break;
            case 'oembed':
                if (req.query.url) {
                    const pathParts = unescape(req.query.url.toString()).split('/');
                    pathParts.splice(0, 3);
                    if (pathParts.length !== 6) { res.status(404).end(); return; }

                    const fullPath = path.resolve(`./${pathParts[0]}/${pathParts[1]}/${pathParts[2]}/${pathParts[3]}/${pathParts[4]}/${pathParts[5]}`);
                    if (!fs.existsSync(fullPath)) { res.status(404).end(); return; }

                    if (/^\.(apng|avif|bmp|gif|ico|jpe|jpeg|jpg|png|webp)$/i.test(path.parse(fullPath).ext)) {
                        ffmpeg(fullPath).ffprobe((err, data) => {
                            if (err) {
                                if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
                                res.status(500).end();
                                return;
                            }

                            if (data.streams[0]) {
                                if (data.streams[0].width && data.streams[0].height) {
                                    const signature = generateSignature(`${Date.now()}|${path.parse(fullPath).base}`, Buffer.from(fs.readFileSync(path.resolve('./signature/key'), 'utf8'), 'hex'))
                                    if (!signature) { res.status(404).end(); return; }

                                    const oEmbedObject = {
                                        'version': '1.0',
                                        'type': 'photo',
                                        'width': data.streams[0].width,
                                        'height': data.streams[0].height,
                                        'title': path.parse(fullPath).base,
                                        'url': `${getURLProtocol()}://${config.config.server.domain}${getURLPort(config.config.server.port)}/${pathParts[0]}/${pathParts[1]}/${pathParts[2]}/${pathParts[3]}/${pathParts[4]}/${pathParts[5]}?source=1&signature=${signature.signature}&iv=${signature.iv}`,
                                        'provider_name': `${pathParts[4]}/${pathParts[3]}/${pathParts[2]} stock`,
                                        'provider_url': `${getURLProtocol()}://${config.config.server.domain}${getURLPort(config.config.server.port)}/${pathParts[0]}/${pathParts[1]}/${pathParts[2]}/${pathParts[3]}/${pathParts[4]}`,
                                        'cache_age': 0
                                    }

                                    res.set('Content-Type', 'application/json');
                                    res.json(oEmbedObject);
                                } else {
                                    res.status(404).end();
                                }
                            } else {
                                res.status(404).end();
                            }
                        });
                    } else if (/^\.(mp4|webm)$/i.test(path.parse(fullPath).ext)) {
                        ffmpeg(fullPath).ffprobe((err, data) => {
                            if (err) {
                                if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
                                res.status(500).end();
                                return;
                            }

                            if (data.streams[0]) {
                                if (data.streams[0].width && data.streams[0].height) {
                                    const signature = generateSignature(`${Date.now()}|${path.parse(fullPath).base}`, Buffer.from(fs.readFileSync(path.resolve('./signature/key'), 'utf8'), 'hex'))
                                    if (!signature) { res.status(404).end(); return; }

                                    const oEmbedObject = {
                                        'version': '1.0',
                                        'type': 'video',
                                        'width': data.streams[0].width,
                                        'height': data.streams[0].height,
                                        'title': path.parse(fullPath).base,
                                        'url': `${getURLProtocol()}://${config.config.server.domain}${getURLPort(config.config.server.port)}/${pathParts[0]}/${pathParts[1]}/${pathParts[2]}/${pathParts[3]}/${pathParts[4]}/${pathParts[5]}?source=1&signature=${signature.signature}&iv=${signature.iv}`,
                                        'provider_name': `Stock ${pathParts[4]}/${pathParts[3]}/${pathParts[2]}`,
                                        'provider_url': `${getURLProtocol()}://${config.config.server.domain}${getURLPort(config.config.server.port)}/${pathParts[0]}/${pathParts[1]}/${pathParts[2]}/${pathParts[3]}/${pathParts[4]}`,
                                        'cache_age': 0
                                    }

                                    res.set('Content-Type', 'application/json');
                                    res.json(oEmbedObject);
                                } else {
                                    res.status(404).end();
                                }
                            } else {
                                res.status(404).end();
                            }
                        });
                    } else {
                        res.status(404).end();
                    }
                } else {
                    res.status(404).end();
                }

                break;
            default:
                res.status(404).end();
                break;
        }
    } catch (err) {
        console.log(err);
        res.status(500).end();
    }
});

export default router;