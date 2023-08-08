// External libs
import express, { Router } from 'express';
import path from 'path';
import fs from 'fs';
import mime from 'mime';
import ffmpeg from 'fluent-ffmpeg';
import { unescape, escape } from 'querystring';

// Internal libs
import { config, mediaRegEx } from '../utils/Storage';
import { checkDifference, decryptSignature, generateSignature, getURL, isInteger, sendForbidden } from '../utils/Functions';
import { StockFile } from '../utils/Structures';

/**
 * Filename router
 * 
 * `/${config.config.server.rootDir}/:category/:year/:month/:day/:filename`
 * 
 * `/${config.config.server.rootDir}/:category/:year/:month/:day/:dir/*`
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

        if (!config.config.categories.includes(req.params.category)) {
            if (req.query.source && req.query.source.toString() === '1') {
                sendForbidden(res);
                return;
            }

            res.status(404).end();
            return;
        }

        const stats: fs.Stats = fs.lstatSync(fullPath);
        const type = (stats.isDirectory()) ? 'directory' : mime.getType(path.parse(fullPath).ext);
        const mediaType = (stats.isDirectory()) ? 'directory' : (mediaRegEx.image.test(path.parse(fullPath).ext)) ? 'image' : (mediaRegEx.video.test(path.parse(fullPath).ext)) ? 'video' : null;

        if (type !== 'directory' && req.query.delete && req.query.delete.toString() === '1') {
            if (!req.query.pass || unescape(req.query.pass.toString()) !== config.config.adminPassword) { res.status(403).end(); return; }

            try {
                fs.unlinkSync(fullPath);
            } catch (err) {
                if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
                res.status(500).end('There was a problem while deleting the file');
                return;
            }

            res.status(200).send(`<!DOCTYPE html>
            <html>
            
            <head>
                <meta charset="UTF-8">
                <title>${req.params.filename} deleted</title>
                <meta http-equiv="content-type" content="text/html; charset=UTF-8">
                <meta name="application-name" content="Stock" />
                <meta name="author" content="Skadro" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
            </head>
            
            <body>
                ${req.params.filename} deleted successfully
            </body>
            <script>
                setTimeout(() => window.close(), 2000);
            </script>
            
            </html>`);
            return;
        }

        if (type && mediaType) {
            if (type == 'directory' && mediaType == 'directory') {
                if (req.query.admin && req.query.admin.toString() === '1') {
                    if (!req.query.pass || unescape(req.query.pass.toString()) !== config.config.adminPassword) { res.status(403).end(); return; }

                    let files: (StockFile | string)[] = fs.readdirSync(fullPath, 'utf-8');
                    if (files.length > config.config.maxFilesPerDay) { res.status(404).send('Max files per day exceeded').end(); return; }

                    let key: Buffer = Buffer.from(process.env.KEY!, 'hex');

                    try {
                        files = (files as string[]).filter((file) => {
                            const stats: fs.Stats = fs.lstatSync(`${fullPath}/${file}`);
                            return stats.isFile() || stats.isDirectory();
                        }).map((file) => {
                            try {
                                let signature = generateSignature(`${Date.now()}|${path.parse(`${fullPath}/${file}`).base}`, key);
                                if (!signature) { throw 'Invalid sig'; }

                                const stats: fs.Stats = fs.lstatSync(`${fullPath}/${file}`);

                                return {
                                    url: (stats.isDirectory()) ? `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${req.params.filename}/${file}?admin=1&pass=${escape(config.config.adminPassword)}` : `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${req.params.filename}/${file}?delete=1&pass=${escape(config.config.adminPassword)}`,
                                    source: (stats.isDirectory()) ? `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${req.params.filename}/${file}` : `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${req.params.filename}/${file}?source=1&signature=${signature.signature}&iv=${signature.iv}`,
                                    filename: path.parse(`${fullPath}/${file}`).base,
                                    type: { mediaType: (stats.isDirectory()) ? 'directory' : (mediaRegEx.image.test(path.parse(`${req.params.day}/${file}`).ext)) ? 'image' : (mediaRegEx.video.test(path.parse(`${req.params.day}/${file}`).ext)) ? 'video' : null, contentType: (stats.isDirectory()) ? 'directory' : mime.getType(path.parse(`${req.params.day}/${file}`).ext) }
                                } as StockFile
                            } catch (err) {
                                throw err;
                            }
                        }).filter((file) => file.type.mediaType && file.type.contentType);

                        if (req.query.filter) files = (files as StockFile[]).filter((file) => req.query.filter!.toString() === file.type.mediaType);
                    } catch (err) {
                        files = [];
                        if (err != 'Invalid sig') {
                            throw err;
                        }
                    }
                    if (files.length === 0) { res.status(404).send('No files available').end(); return; }

                    (files as StockFile[]).sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' }));

                    const pages = Math.ceil(files.length / config.config.filesPerPage);

                    if (req.query.page) {
                        if (isInteger(req.query.page.toString())) {
                            if ((parseInt(req.query.page.toString()) > pages) || (parseInt(req.query.page.toString()) < 1)) { res.redirect(`${getURL(config.config.server.rootDir, req.params.category, req.params.year, req.params.month, req.params.day, req.params.filename)}?admin=1&pass=${escape(config.config.adminPassword)}`); return; }
                        } else {
                            res.redirect(`${getURL(config.config.server.rootDir, req.params.category, req.params.year, req.params.month, req.params.day, req.params.filename)}?admin=1&pass=${escape(config.config.adminPassword)}`);
                            return;
                        }
                    }

                    const url = getURL(config.config.server.rootDir, req.params.category, req.params.year, req.params.month, req.params.day, req.params.filename);

                    res.render('index', {
                        meta: {
                            pageTitle: `Page ${(req.query.page) ? req.query.page : '1'} - ${req.params.day}/${req.params.month}/${req.params.year} ${req.params.category}/${req.params.filename} stock`,
                            title: `${req.params.category}/${req.params.filename} (admin)`,
                            date: `${req.params.day}/${req.params.month}/${req.params.year}`,
                            description: `The ${req.params.day}/${req.params.month}/${req.params.year} ${req.params.category}/${req.params.filename} stock with ${(files.length === 1) ? `1 file` : `${files.length} files`} is available now`,
                            siteName: 'Gu Stock',
                            url: url,
                            image: getURL(config.config.server.rootDir, 'views', 'stock.jpg'),
                            oEmbed: `${getURL(config.config.server.rootDir)}/oembed?url=${escape(url)}`
                        },
                        stylesheet: `/${config.config.server.rootDir}/views/index.css`,
                        favicon: `/${config.config.server.rootDir}/views/favicon.ico`,
                        directoryIcon: `/${config.config.server.rootDir}/views/directory.png`,
                        files: files,
                        filesPerPage: config.config.filesPerPage,
                        page: (req.query.page) ? parseInt(req.query.page.toString()) : 1,
                        adminPassword: config.config.adminPassword,
                        secured: process.env.TLS_CERT && process.env.TLS_KEY
                    }, (err: Error, html: string) => {
                        if (err) {
                            if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
                            res.status(500).end();
                            return;
                        }

                        if (html) res.status(200).send(html);
                    });

                    return;
                }

                let files: (StockFile | string)[] = fs.readdirSync(fullPath, 'utf-8');
                if (files.length > config.config.maxFilesPerDay) { res.status(404).send('Max files per day exceeded').end(); return; }

                let key: Buffer = Buffer.from(process.env.KEY!, 'hex');

                try {
                    files = (files as string[]).filter((file) => {
                        const stats: fs.Stats = fs.lstatSync(`${fullPath}/${file}`);
                        return stats.isFile() || stats.isDirectory();
                    }).map((file) => {
                        try {
                            let signature = generateSignature(`${Date.now()}|${path.parse(`${fullPath}/${file}`).base}`, key);
                            if (!signature) { throw 'Invalid sig'; }

                            const stats: fs.Stats = fs.lstatSync(`${fullPath}/${file}`);

                            return {
                                url: `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${req.params.filename}/${file}`,
                                source: (stats.isDirectory()) ? `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${req.params.filename}/${file}` : `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${req.params.filename}/${file}?source=1&signature=${signature.signature}&iv=${signature.iv}`,
                                filename: path.parse(`${fullPath}/${file}`).base,
                                type: { mediaType: (stats.isDirectory()) ? 'directory' : (mediaRegEx.image.test(path.parse(`${req.params.day}/${file}`).ext)) ? 'image' : (mediaRegEx.video.test(path.parse(`${req.params.day}/${file}`).ext)) ? 'video' : null, contentType: (stats.isDirectory()) ? 'directory' : mime.getType(path.parse(`${req.params.day}/${file}`).ext) }
                            } as StockFile
                        } catch (err) {
                            throw err;
                        }
                    }).filter((file) => file.type.mediaType && file.type.contentType);

                    if (req.query.filter) files = (files as StockFile[]).filter((file) => req.query.filter!.toString() === file.type.mediaType);
                } catch (err) {
                    files = [];
                    if (err != 'Invalid sig') {
                        throw err;
                    }
                }
                if (files.length === 0) { res.status(404).send('No files available').end(); return; }

                (files as StockFile[]).sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' }));

                const pages = Math.ceil(files.length / config.config.filesPerPage);

                if (req.query.page) {
                    if (isInteger(req.query.page.toString())) {
                        if ((parseInt(req.query.page.toString()) > pages) || (parseInt(req.query.page.toString()) < 1)) { res.redirect(getURL(config.config.server.rootDir, req.params.category, req.params.year, req.params.month, req.params.day, req.params.filename)); return; }
                    } else {
                        res.redirect(getURL(config.config.server.rootDir, req.params.category, req.params.year, req.params.month, req.params.day, req.params.filename));
                        return;
                    }
                }

                const url: string = getURL(config.config.server.rootDir, req.params.category, req.params.year, req.params.month, req.params.day, req.params.filename);

                res.render('index', {
                    meta: {
                        pageTitle: `Page ${(req.query.page) ? req.query.page : '1'} - ${req.params.day}/${req.params.month}/${req.params.year} ${req.params.category}/${req.params.filename} stock`,
                        title: `${req.params.category}/${req.params.filename}`,
                        date: `${req.params.day}/${req.params.month}/${req.params.year}`,
                        description: `The ${req.params.day}/${req.params.month}/${req.params.year} ${req.params.category}/${req.params.filename} stock with ${(files.length === 1) ? `1 file` : `${files.length} files`} is available now`,
                        siteName: 'Gu Stock',
                        url: url,
                        image: getURL(config.config.server.rootDir, 'views', 'stock.jpg'),
                        oEmbed: `${getURL(config.config.server.rootDir)}/oembed?url=${escape(url)}`
                    },
                    stylesheet: `/${config.config.server.rootDir}/views/index.css`,
                    favicon: `/${config.config.server.rootDir}/views/favicon.ico`,
                    directoryIcon: `/${config.config.server.rootDir}/views/directory.png`,
                    files: files,
                    filesPerPage: config.config.filesPerPage,
                    page: (req.query.page) ? parseInt(req.query.page.toString()) : 1,
                    adminPassword: null,
                    secured: process.env.TLS_CERT && process.env.TLS_KEY
                }, (err: Error, html: string) => {
                    if (err) {
                        if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
                        res.status(500).end();
                        return;
                    }

                    if (html) res.status(200).send(html);
                });

                return;
            }

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
                                let decryptedSignature = decryptSignature(unescape(req.query.signature.toString()), Buffer.from(process.env.KEY!, 'hex'), unescape(req.query.iv.toString()));
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
                            const url = getURL(config.config.server.rootDir, req.params.category, req.params.year, req.params.month, req.params.day, undefined, false, req.params.filename);

                            if (req.query.signature || req.query.iv) {
                                res.redirect(url);
                                return;
                            }

                            let signature = generateSignature(`${Date.now()}|${path.parse(fullPath).base}`, Buffer.from(process.env.KEY!, 'hex'));
                            if (!signature) { res.status(500).end(); return; }

                            res.render('media', {
                                meta: {
                                    title: `${req.params.filename} (${data.streams[0].width}x${data.streams[0].height})`,
                                    filename: req.params.filename,
                                    mediaType: mediaType,
                                    contentType: type,
                                    width: data.streams[0].width,
                                    height: data.streams[0].height,
                                    url: url,
                                    siteName: 'Gu Stock',
                                    mediaURL: `${url}?source=1&signature=${escape(signature.signature)}&iv=${escape(signature.iv)}`,
                                    thumbnail: `${getURL(config.config.server.rootDir, req.params.category, req.params.year, req.params.month, req.params.day, undefined, true, req.params.filename)}?signature=${escape(signature.signature)}&iv=${escape(signature.iv)}`,
                                    oEmbed: `${getURL(config.config.server.rootDir)}/oembed?url=${escape(url)}`
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
                    } else res.status(404).end();
                } else res.status(404).end();
            });
        } else res.status(404).end();
    } catch (err) {
        console.log(err);
        res.status(500).end();
    }
});

router.get(`/${config.config.server.rootDir}/:category/:year/:month/:day/:dir/*`, (req, res) => {
    try {
        req.on('error', (err) => {
            if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
            res.status(500).end();
        });

        res.on('error', (err) => {
            if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
            res.status(500).end();
        });

        let fullPath = path.resolve(`./${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${req.params.dir}`);

        let stats: fs.Stats = fs.lstatSync(fullPath);
        let type = (stats.isDirectory()) ? 'directory' : mime.getType(path.parse(fullPath).ext);
        let mediaType = (stats.isDirectory()) ? 'directory' : (mediaRegEx.image.test(path.parse(fullPath).ext)) ? 'image' : (mediaRegEx.video.test(path.parse(fullPath).ext)) ? 'video' : null;

        if (!fs.existsSync(fullPath)) {
            if (req.query.source && req.query.source.toString() === '1') {
                sendForbidden(res);
                return;
            }

            res.status(404).end();
            return;
        }

        if (!config.config.categories.includes(req.params.category)) {
            if (req.query.source && req.query.source.toString() === '1') {
                sendForbidden(res);
                return;
            }

            res.status(404).end();
            return;
        }

        if (type === 'directory' && mediaType === 'directory') {
            let dirPath: string | undefined = (req.params as Record<string, string>)[0];
            if (!dirPath) { res.status(404).end(); return; }
            fullPath += `/${dirPath}`;

            stats = fs.lstatSync(fullPath);
            type = (stats.isDirectory()) ? 'directory' : mime.getType(path.parse(fullPath).ext);
            mediaType = (stats.isDirectory()) ? 'directory' : (mediaRegEx.image.test(path.parse(fullPath).ext)) ? 'image' : (mediaRegEx.video.test(path.parse(fullPath).ext)) ? 'video' : null;

            if (type === 'directory' && mediaType === 'directory') {
                let files: (StockFile | string)[] = fs.readdirSync(fullPath, 'utf-8');
                if (files.length > config.config.maxFilesPerDay) { res.status(404).send('Max files per day exceeded').end(); return; }

                let key: Buffer = Buffer.from(process.env.KEY!, 'hex');

                if (req.query.admin && req.query.admin.toString() === '1') {
                    if (!req.query.pass || unescape(req.query.pass.toString()) !== config.config.adminPassword) { res.status(403).end(); return; }

                    try {
                        files = (files as string[]).filter((file) => {
                            const stats: fs.Stats = fs.lstatSync(`${fullPath}/${file}`);
                            return stats.isFile() || stats.isDirectory();
                        }).map((file) => {
                            try {
                                let signature = generateSignature(`${Date.now()}|${path.parse(`${fullPath}/${file}`).base}`, key);
                                if (!signature) { throw 'Invalid sig'; }

                                const stats: fs.Stats = fs.lstatSync(`${fullPath}/${file}`);

                                return {
                                    url: (stats.isDirectory()) ? `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${req.params.dir}/${dirPath}/${file}?admin=1&pass=${escape(config.config.adminPassword)}` : `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${req.params.dir}/${dirPath}/${file}?delete=1&pass=${escape(config.config.adminPassword)}`,
                                    source: (stats.isDirectory()) ? `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${req.params.dir}/${dirPath}/${file}` : `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${req.params.dir}/${dirPath}/${file}?source=1&signature=${signature.signature}&iv=${signature.iv}`,
                                    filename: path.parse(`${fullPath}/${file}`).base,
                                    type: { mediaType: (stats.isDirectory()) ? 'directory' : (mediaRegEx.image.test(path.parse(`${req.params.day}/${req.params.dir}/${dirPath}/${file}`).ext)) ? 'image' : (mediaRegEx.video.test(path.parse(`${req.params.day}/${req.params.dir}/${dirPath}/${file}`).ext)) ? 'video' : null, contentType: (stats.isDirectory()) ? 'directory' : mime.getType(path.parse(`${req.params.day}/${req.params.dir}/${dirPath}/${file}`).ext) }
                                } as StockFile
                            } catch (err) {
                                throw err;
                            }
                        }).filter((file) => file.type.mediaType && file.type.contentType);
                    } catch (err) {
                        files = [];
                        if (err != 'Invalid sig') {
                            throw err;
                        }
                    }
                } else {
                    try {
                        files = (files as string[]).filter((file) => {
                            const stats: fs.Stats = fs.lstatSync(`${fullPath}/${file}`);
                            return stats.isFile() || stats.isDirectory();
                        }).map((file) => {
                            try {
                                let signature = generateSignature(`${Date.now()}|${path.parse(`${fullPath}/${file}`).base}`, key);
                                if (!signature) { throw 'Invalid sig'; }

                                const stats: fs.Stats = fs.lstatSync(`${fullPath}/${file}`);

                                return {
                                    url: `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${req.params.dir}/${dirPath}/${file}`,
                                    source: (stats.isDirectory()) ? `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${req.params.dir}/${dirPath}/${file}` : `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${req.params.dir}/${dirPath}/${file}?source=1&signature=${signature.signature}&iv=${signature.iv}`,
                                    filename: path.parse(`${fullPath}/${file}`).base,
                                    type: { mediaType: (stats.isDirectory()) ? 'directory' : (mediaRegEx.image.test(path.parse(`${req.params.day}/${req.params.dir}/${dirPath}/${file}`).ext)) ? 'image' : (mediaRegEx.video.test(path.parse(`${req.params.day}/${req.params.dir}/${dirPath}/${file}`).ext)) ? 'video' : null, contentType: (stats.isDirectory()) ? 'directory' : mime.getType(path.parse(`${req.params.day}/${req.params.dir}/${dirPath}/${file}`).ext) }
                                } as StockFile
                            } catch (err) {
                                throw err;
                            }
                        }).filter((file) => file.type.mediaType && file.type.contentType);
                    } catch (err) {
                        files = [];
                        if (err != 'Invalid sig') {
                            throw err;
                        }
                    }
                }
                if (files.length === 0) { res.status(404).send('No files available').end(); return; }

                (files as StockFile[]).sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' }));

                const pages = Math.ceil(files.length / config.config.filesPerPage);

                if (req.query.page) {
                    if (isInteger(req.query.page.toString())) {
                        if ((parseInt(req.query.page.toString()) > pages) || (parseInt(req.query.page.toString()) < 1)) { res.redirect(getURL(config.config.server.rootDir, req.params.category, req.params.year, req.params.month, req.params.day, req.params.dir)); return; }
                    } else {
                        res.redirect(getURL(config.config.server.rootDir, req.params.category, req.params.year, req.params.month, req.params.day, req.params.dir));
                        return;
                    }
                }

                const url = `${getURL(config.config.server.rootDir, req.params.category, req.params.year, req.params.month, req.params.day, req.params.dir)}/${dirPath}`;

                res.render('index', {
                    meta: {
                        pageTitle: `Page ${(req.query.page) ? req.query.page : '1'} - ${req.params.day}/${req.params.month}/${req.params.year} ${req.params.category}/${req.params.dir}/${dirPath} stock`,
                        title: `${req.params.category}/${req.params.dir}/${dirPath}`,
                        date: `${req.params.day}/${req.params.month}/${req.params.year}`,
                        description: `The ${req.params.day}/${req.params.month}/${req.params.year} ${req.params.category}/${req.params.dir}/${dirPath} stock with ${(files.length === 1) ? `1 file` : `${files.length} files`} is available now`,
                        siteName: 'Gu Stock',
                        url: url,
                        image: getURL(config.config.server.rootDir, 'views', 'stock.jpg'),
                        oEmbed: `${getURL(config.config.server.rootDir)}/oembed?url=${escape(url)}`
                    },
                    stylesheet: `/${config.config.server.rootDir}/views/index.css`,
                    favicon: `/${config.config.server.rootDir}/views/favicon.ico`,
                    directoryIcon: `/${config.config.server.rootDir}/views/directory.png`,
                    files: files,
                    filesPerPage: config.config.filesPerPage,
                    page: (req.query.page) ? parseInt(req.query.page.toString()) : 1,
                    adminPassword: (req.query.admin && req.query.admin.toString() === '1') ? config.config.adminPassword : null,
                    secured: process.env.TLS_CERT && process.env.TLS_KEY
                }, (err: Error, html: string) => {
                    if (err) {
                        if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
                        res.status(500).end();
                        return;
                    }

                    if (html) res.status(200).send(html);
                });
            } else {
                if (type && mediaType) {
                    let filenameParts = dirPath!.split('/');
                    let filename = filenameParts[filenameParts.length - 1];
                    if (!filename) { res.status(404).end(); return; }

                    if (req.query.delete && req.query.delete.toString() === '1') {
                        if (!req.query.pass || unescape(req.query.pass.toString()) !== config.config.adminPassword) { res.status(403).end(); return; }

                        try {
                            fs.unlinkSync(fullPath);
                        } catch (err) {
                            if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
                            res.status(500).end('There was a problem while deleting the file');
                            return;
                        }

                        res.status(200).send(`<!DOCTYPE html>
                        <html>
                        
                        <head>
                            <meta charset="UTF-8">
                            <title>${filename} deleted</title>
                            <meta http-equiv="content-type" content="text/html; charset=UTF-8">
                            <meta name="application-name" content="Stock" />
                            <meta name="author" content="Skadro" />
                            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
                        </head>
                        
                        <body>
                            ${filename} deleted successfully
                        </body>
                        <script>
                            setTimeout(() => window.close(), 2000);
                        </script>
                        
                        </html>`);

                        return;
                    }


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
                                        let decryptedSignature = decryptSignature(unescape(req.query.signature.toString()), Buffer.from(process.env.KEY!, 'hex'), unescape(req.query.iv.toString()));
                                        if (!decryptedSignature) { sendForbidden(res); return; }

                                        const signatureParts = decryptedSignature.split('|');
                                        if (signatureParts.length !== 2) { sendForbidden(res); return; }
                                        if (!signatureParts[0] || !signatureParts[1]) { sendForbidden(res); return; }

                                        if (isInteger(signatureParts[0]) && checkDifference(signatureParts[0], config.config.server.signatureExpiry) && signatureParts[1] === path.parse(fullPath).base) {
                                            res.set('Content-Type', type!);
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
                                    const url = getURL(config.config.server.rootDir, req.params.category, req.params.year, req.params.month, req.params.day, req.params.dir, false, dirPath);

                                    if (req.query.signature || req.query.iv) {
                                        res.redirect(url);
                                        return;
                                    }

                                    let signature = generateSignature(`${Date.now()}|${path.parse(fullPath).base}`, Buffer.from(process.env.KEY!, 'hex'));
                                    if (!signature) { res.status(500).end(); return; }

                                    let dir: string[] | string = dirPath!.split('/');
                                    dir.pop();
                                    dir = dir.join('/');

                                    res.render('media', {
                                        meta: {
                                            title: `${filename} (${data.streams[0].width}x${data.streams[0].height})`,
                                            filename: filename,
                                            mediaType: mediaType,
                                            contentType: type,
                                            width: data.streams[0].width,
                                            height: data.streams[0].height,
                                            url: url,
                                            siteName: 'Gu Stock',
                                            mediaURL: `${url}?source=1&signature=${escape(signature.signature)}&iv=${escape(signature.iv)}`,
                                            thumbnail: `${getURL(config.config.server.rootDir, req.params.category, req.params.year, req.params.month, req.params.day, undefined, true, `${req.params.dir}/${dirPath}`)}?signature=${escape(signature.signature)}&iv=${escape(signature.iv)}`,
                                            oEmbed: `${getURL(config.config.server.rootDir)}/oembed?url=${escape(url)}`,
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
                            } else res.status(404).end();
                        } else res.status(404).end();
                    });
                }
            }
        } else res.status(404).end();
    } catch (err) {
        console.log(err);
        res.status(500).end();
    }
});

export default router;