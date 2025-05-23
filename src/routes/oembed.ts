// External libs
import express, { Router } from 'express';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { escape, unescape } from 'querystring';
import mime from 'mime';

// Internal libs
import { config, mediaRegEx } from '../utils/Storage';
import { generateSignature, getURL, isInDevelopment } from '../utils/Functions';

/**
 * oEmbed router
 * 
 * `/oembed`: GET
 */
const router: Router = express.Router({ caseSensitive: true });

router.get(`/oembed`, async (req, res) => {
    req.on('error', (err) => {
        if (isInDevelopment()) console.log(err);
        res.status(500).end();
    });

    res.on('error', (err) => {
        if (isInDevelopment()) console.log(err);
        res.status(500).end();
    });

    if (req.query.url && req.query.format) {
        let pathParts: string[] = unescape(req.query.url.toString()).split('/');
        pathParts.splice(0, 3);

        const fullPath: string = path.resolve(`./${pathParts.join('/')}`);
        pathParts.splice(0, 1);

        if (!fs.existsSync(fullPath)) { res.status(404).end(); return; }

        const stats: fs.Stats = fs.lstatSync(fullPath);
        const type: string | null = (stats.isDirectory()) ? 'directory' : mime.getType(path.parse(fullPath).ext);
        const mediaType: 'directory' | 'image' | 'video' | null = (stats.isDirectory()) ? 'directory' : (mediaRegEx.image.test(path.parse(fullPath).ext)) ? 'image' : (mediaRegEx.video.test(path.parse(fullPath).ext)) ? 'video' : null;

        let filePath: string[] = pathParts.slice(4);

        if (type === 'directory' && mediaType === 'directory') {
            if (req.query.format && req.query.format.toString() === 'json') {
                const oEmbedObject = {
                    'version': '1.0',
                    'type': 'link',
                    'title': path.parse(fullPath).base,
                    'provider_name': `${pathParts[3]}/${pathParts[2]}/${pathParts[1]} ${pathParts[0]}${(filePath.slice(0, filePath.length - 1).length > 0) ? `/${filePath.slice(0, filePath.length - 1).join('/')}` : ''}`,
                    'provider_url': getURL(config.config.server.rootDir, pathParts[0], pathParts[1], pathParts[2], pathParts[3], (filePath.slice(0, filePath.length - 1).length > 0) ? filePath.slice(0, filePath.length - 1).join('/') : undefined)
                }

                res.set('Content-Type', 'application/json');
                res.status(200).send(oEmbedObject);
            } else if (req.query.format && req.query.format.toString() === 'xml') {
                const oEmbedXML = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
                            <oembed>
                                <version>1.0</version>
                                <type>link</type>
                                <title>${escape(path.parse(fullPath).base)}</title>
                                <provider_name>${escape(`${pathParts[3]}/${pathParts[2]}/${pathParts[1]} ${pathParts[0]}${(filePath.slice(0, filePath.length - 1).length > 0) ? `/${filePath.slice(0, filePath.length - 1).join('/')}` : ''}`)}</provider_name>
                                <provider_url>${escape(getURL(config.config.server.rootDir, pathParts[0], pathParts[1], pathParts[2], pathParts[3], (filePath.slice(0, filePath.length - 1).length > 0) ? filePath.slice(0, filePath.length - 1).join('/') : undefined))}</provider_url>
                            </oembed>`

                res.set('Content-Type', 'text/xml');
                res.status(200).send(oEmbedXML);
            } else res.status(404).end();

            return;
        }

        if (mediaType === 'image') {
            ffmpeg(fullPath).ffprobe((err, data) => {
                if (err) {
                    if (isInDevelopment()) console.log(err);
                    res.status(500).end();
                    return;
                }

                if (data.streams[0] && type) {
                    if (data.streams[0].width && data.streams[0].height) {
                        const signature = generateSignature(`${Date.now()}|${path.parse(fullPath).base}`, Buffer.from(process.env.KEY!, 'hex'));
                        if (!signature) { res.status(404).end(); return; }

                        if (req.query.format && req.query.format.toString() === 'json') {
                            const oEmbedObject = {
                                'version': '1.0',
                                'type': 'photo',
                                'width': data.streams[0].width,
                                'height': data.streams[0].height,
                                'title': path.parse(fullPath).base,
                                'html': `<iframe src="${getURL(config.config.server.rootDir, pathParts[0], pathParts[1], pathParts[2], pathParts[3], (filePath.length > 0) ? filePath.join('/') : undefined)}?source=1&signature=${signature.signature}&iv=${signature.iv}" type="${type}" width="${data.streams[0].width}" height="${data.streams[0].height}" title="${filePath[filePath.length - 1]}"</iframe>`,
                                'url': `${getURL(config.config.server.rootDir, pathParts[0], pathParts[1], pathParts[2], pathParts[3], (filePath.length > 0) ? filePath.join('/') : undefined)}?source=1&signature=${signature.signature}&iv=${signature.iv}`,
                                'provider_name': `${pathParts[3]}/${pathParts[2]}/${pathParts[1]} ${pathParts[0]}${(filePath.slice(0, filePath.length - 1).length > 0) ? `/${filePath.slice(0, filePath.length - 1).join('/')}` : ''}`,
                                'provider_url': getURL(config.config.server.rootDir, pathParts[0], pathParts[1], pathParts[2], pathParts[3], (filePath.slice(0, filePath.length - 1).length > 0) ? filePath.slice(0, filePath.length - 1).join('/') : undefined)
                            }

                            res.set('Content-Type', 'application/json');
                            res.status(200).send(oEmbedObject);
                        } else if (req.query.format && req.query.format.toString() === 'xml') {
                            const oEmbedXML = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
                                        <oembed>
                                            <version>1.0</version>
                                            <type>photo</type>
                                            <width>${data.streams[0].width}</width>
                                            <height>${data.streams[0].height}</height>
                                            <title>${escape(path.parse(fullPath).base)}</title>
                                            <html>${escape(`<iframe src="${getURL(config.config.server.rootDir, pathParts[0], pathParts[1], pathParts[2], pathParts[3], (filePath.length > 0) ? filePath.join('/') : undefined)}?source=1&signature=${signature.signature}&iv=${signature.iv}" type="${type}" width="${data.streams[0].width}" height="${data.streams[0].height}" title="${filePath[filePath.length - 1]}"</iframe>`)}</html>
                                            <url>${escape(`${getURL(config.config.server.rootDir, pathParts[0], pathParts[1], pathParts[2], pathParts[3], (filePath.length > 0) ? filePath.join('/') : undefined)}?source=1&signature=${signature.signature}&iv=${signature.iv}`)}</url>
                                            <provider_name>${escape(`${pathParts[3]}/${pathParts[2]}/${pathParts[1]} ${pathParts[0]}${(filePath.slice(0, filePath.length - 1).length > 0) ? `/${filePath.slice(0, filePath.length - 1).join('/')}` : ''}`)}</provider_name>
                                            <provider_url>${escape(getURL(config.config.server.rootDir, pathParts[0], pathParts[1], pathParts[2], pathParts[3], (filePath.slice(0, filePath.length - 1).length > 0) ? filePath.slice(0, filePath.length - 1).join('/') : undefined))}</provider_url>
                                        </oembed>`

                            res.set('Content-Type', 'text/xml');
                            res.status(200).send(oEmbedXML);
                        } else res.status(404).end();
                    } else res.status(404).end();
                } else res.status(404).end();
            });
        } else if (mediaType === 'video') {
            ffmpeg(fullPath).ffprobe((err, data) => {
                if (err) {
                    if (isInDevelopment()) console.log(err);
                    res.status(500).end();
                    return;
                }

                if (data.streams[0] && type) {
                    if (data.streams[0].width && data.streams[0].height && data.streams[0].duration) {
                        const signature = generateSignature(`${Date.now()}|${path.parse(fullPath).base}`, Buffer.from(process.env.KEY!, 'hex'))
                        if (!signature) { res.status(404).end(); return; }

                        if (req.query.format && req.query.format.toString() === 'json') {
                            const oEmbedObject = {
                                'version': '1.0',
                                'type': 'video',
                                'width': data.streams[0].width,
                                'height': data.streams[0].height,
                                'duration': Math.floor(Number(data.streams[0].duration)),
                                'url': getURL(config.config.server.rootDir, pathParts[0], pathParts[1], pathParts[2], pathParts[3], (filePath.length > 0) ? filePath.join('/') : undefined),
                                'title': path.parse(fullPath).base,
                                'thumbnail_url': `${getURL(config.config.server.rootDir, pathParts[0], pathParts[1], pathParts[2], pathParts[3], (filePath.length > 0) ? filePath.join('/') : undefined)}_thumb.png?signature=${signature.signature}&iv=${signature.iv}`,
                                'thumbnail_width': data.streams[0].width,
                                'thumbnail_height': data.streams[0].height,
                                'html': `<iframe src="${getURL(config.config.server.rootDir, pathParts[0], pathParts[1], pathParts[2], pathParts[3], (filePath.length > 0) ? filePath.join('/') : undefined)}?source=1&signature=${signature.signature}&iv=${signature.iv}" type="${type}" width="${data.streams[0].width}" height="${data.streams[0].height}" allowfullscreen</iframe>`,
                                'provider_name': `${pathParts[3]}/${pathParts[2]}/${pathParts[1]} ${pathParts[0]}${(filePath.slice(0, filePath.length - 1).length > 0) ? `/${filePath.slice(0, filePath.length - 1).join('/')}` : ''}`,
                                'provider_url': getURL(config.config.server.rootDir, pathParts[0], pathParts[1], pathParts[2], pathParts[3], (filePath.slice(0, filePath.length - 1).length > 0) ? filePath.slice(0, filePath.length - 1).join('/') : undefined)
                            }

                            res.set('Content-Type', 'application/json');
                            res.status(200).send(oEmbedObject);
                        } else if (req.query.format && req.query.format.toString() === 'xml') {
                            const oEmbedXML = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
                                        <oembed>
                                            <version>1.0</version>
                                            <type>video</type>
                                            <width>${data.streams[0].width}</width>
                                            <height>${data.streams[0].height}</height>
                                            <duration>${Math.floor(Number(data.streams[0].duration))}</duration>
                                            <url>${escape(`${getURL(config.config.server.rootDir, pathParts[0], pathParts[1], pathParts[2], pathParts[3], (filePath.length > 0) ? filePath.join('/') : undefined)}`)}</url>
                                            <title>${escape(path.parse(fullPath).base)}</title>
                                            <thumbnail_url>${escape(`${getURL(config.config.server.rootDir, pathParts[0], pathParts[1], pathParts[2], pathParts[3], (filePath.length > 0) ? filePath.join('/') : undefined)}_thumb.png?signature=${signature.signature}&iv=${signature.iv}`)}</thumbnail_url>
                                            <thumbnail_width>${data.streams[0].width}</thumbnail_width>
                                            <thumbnail_height>${data.streams[0].height}</thumbnail_height>
                                            <html>${escape(`<iframe src="${getURL(config.config.server.rootDir, pathParts[0], pathParts[1], pathParts[2], pathParts[3], (filePath.length > 0) ? filePath.join('/') : undefined)}?source=1&signature=${signature.signature}&iv=${signature.iv}" type="${type}" width="${data.streams[0].width}" height="${data.streams[0].height}" allowfullscreen</iframe>`)}</html>
                                            <provider_name>${escape(`${pathParts[3]}/${pathParts[2]}/${pathParts[1]} ${pathParts[0]}${(filePath.slice(0, filePath.length - 1).length > 0) ? `/${filePath.slice(0, filePath.length - 1).join('/')}` : ''}`)}</provider_name>
                                            <provider_url>${escape(getURL(config.config.server.rootDir, pathParts[0], pathParts[1], pathParts[2], pathParts[3], (filePath.slice(0, filePath.length - 1).length > 0) ? filePath.slice(0, filePath.length - 1).join('/') : undefined))}</provider_url>
                                        </oembed>`

                            res.set('Content-Type', 'text/xml');
                            res.status(200).send(oEmbedXML);
                        } else res.status(404).end();
                    } else res.status(404).end();
                } else res.status(404).end();
            });
        } else res.status(404).end();
    } else res.status(404).end();
});

export default router;