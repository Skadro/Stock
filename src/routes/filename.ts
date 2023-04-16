// External libs
import express, { Router } from 'express';
import path from 'path';
import fs from 'fs';
import mime from 'mime';
import ffmpeg from 'fluent-ffmpeg';
import { unescape, escape } from 'querystring';

// Internal libs
import { config } from '../utils/Storage';
import { checkDifference, decryptSignature, generateSignature, getURLPort, getURLProtocol, isInteger, sendForbidden } from '../utils/Functions';

/**
 * Filename router
 * 
 * `/${config.config.server.rootDir}/:category/:year/:month/:day/:filename`
 */
const router: Router = express.Router({ caseSensitive: true });

router.get(`/${config.config.server.rootDir}/:category/:year/:month/:day/:filename`, (req, res) => {
    try {
        req.on('error', (err) => {
            if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
            res.status(500).end();
        });

        res.on('error', (err) => {
            if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
            res.status(500).end();
        });

        const fullPath = path.resolve(`./${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${req.params.filename}`);
        if (!fs.existsSync(fullPath)) {
            if (req.query.source && req.query.source.toString() === '1') {
                sendForbidden(res);
                return;
            }

            res.status(404).end();
            return;
        }

        const type = mime.getType(path.parse(fullPath).ext);
        const mediaType = (/^\.(apng|avif|bmp|gif|ico|jpe|jpeg|jpg|png|webp)$/i.test(path.parse(fullPath).ext)) ? 'image' : (/^\.(mp4|webm)$/i.test(path.parse(fullPath).ext)) ? 'video' : null;

        if (type && mediaType) {
            ffmpeg(fullPath).ffprobe((err, data) => {
                if (err) {
                    if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
                    res.status(500).end();
                    return;
                }

                if (data.streams[0]) {
                    if (data.streams[0].width && data.streams[0].height) {
                        if (req.query.source && req.query.source.toString() === '1') {
                            if (req.query.signature && req.query.iv) {
                                let decryptedSignature = decryptSignature(unescape(req.query.signature.toString()), Buffer.from(fs.readFileSync(path.resolve('./signature/key'), 'utf8'), 'hex'), unescape(req.query.iv.toString()));
                                if (!decryptedSignature) { sendForbidden(res); return; }

                                const signatureParts = decryptedSignature.split('|');
                                if (signatureParts.length !== 2) { sendForbidden(res); return; }
                                if (!signatureParts[0] || !signatureParts[1]) { sendForbidden(res); return; }

                                if (isInteger(signatureParts[0]) && checkDifference(signatureParts[0], config.config.server.signatureExpiry) && signatureParts[1] === path.parse(fullPath).base) {
                                    res.set('Content-Type', type);
                                    res.status(200).sendFile(fullPath, (err) => {
                                        if (err) {
                                            if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
                                            res.status(500).end();
                                        }
                                    });
                                } else {
                                    sendForbidden(res);
                                    return;
                                }
                            } else {
                                sendForbidden(res);
                                return;
                            }
                        } else {
                            const url = `${getURLProtocol()}://${config.config.server.domain}${getURLPort(config.config.server.port)}/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${req.params.filename}`;

                            if (req.query.signature || req.query.iv) {
                                res.redirect(`${url}`);
                                return;
                            }

                            let signature = generateSignature(`${Date.now()}|${path.parse(fullPath).base}`, Buffer.from(fs.readFileSync(path.resolve('./signature/key'), 'utf8'), 'hex'));
                            if (!signature) { res.status(500).end(); return; }

                            res.status(200).render('media', {
                                meta: {
                                    title: `${req.params.filename} (${data.streams[0].width}x${data.streams[0].height})`,
                                    filename: req.params.filename,
                                    mediaType: mediaType,
                                    contentType: type,
                                    width: data.streams[0].width,
                                    height: data.streams[0].height,
                                    url: url,
                                    mediaURL: `${url}?source=1&signature=${escape(signature.signature)}&iv=${escape(signature.iv)}`,
                                    oEmbed: `${getURLProtocol()}://${config.config.server.domain}${getURLPort(config.config.server.port)}/${config.config.server.rootDir}/oembed?url=${escape(url)}`
                                },
                                stylesheet: `/${config.config.server.rootDir}/views/media.css`,
                                favicon: `/${config.config.server.rootDir}/views/favicon.ico`,
                                zoomScript: `/${config.config.server.rootDir}/views/zoom.js`,
                                secured: process.env.TLS_CERT && process.env.TLS_KEY
                            }, (err: Error, html: string) => {
                                if (err) {
                                    if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
                                    res.status(500).end();
                                    return;
                                }

                                if (html) res.status(200).send(html);
                            });
                        }
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
    } catch (err) {
        console.log(err);
        res.status(500).end();
    }
});

router.get(`/${config.config.server.rootDir}/:category/:year/:month/:day/:filename/*`, (_req, res) => {
    res.status(404).end();
});

export default router;