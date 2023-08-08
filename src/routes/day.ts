// External libs
import express, { Router } from 'express';
import path from 'path';
import fs from 'fs';
import mime from 'mime';
import { escape, unescape } from 'querystring';
import childProcess from 'child_process';

// Internal libs
import { config, mediaRegEx } from '../utils/Storage';
import { checkDifference, decryptSignature, generateSignature, getURL, isInteger, sendForbidden } from '../utils/Functions';
import { StockFile } from '../utils/Structures';

/**
 * Day router
 * 
 * `/${config.config.server.rootDir}/:category/:year/:month/:day`
 * 
 * `/${config.config.server.rootDir}/:category/:year/:month/:day/thumbs`
 * 
 * `/${config.config.server.rootDir}/:category/:year/:month/:day/thumbs/*`
 */
const router: Router = express.Router({ caseSensitive: true });

router.get(`/${config.config.server.rootDir}/:category/:year/:month/:day`, (req, res) => {
    try {
        req.on('error', (err) => {
            if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
            res.status(500).end();
        });

        res.on('error', (err) => {
            if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
            res.status(500).end();
        });

        const fullPath = path.resolve(`./${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}`);
        if (!fs.existsSync(fullPath)) { res.status(404).end(); return; }
        if (!config.config.categories.includes(req.params.category)) { res.status(404).end(); return; }

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
                            url: (stats.isDirectory()) ? `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${file}?admin=1&pass=${escape(config.config.adminPassword)}` : `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${file}?delete=1&pass=${escape(config.config.adminPassword)}`,
                            source: (stats.isDirectory()) ? `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${file}` : `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${file}?source=1&signature=${signature.signature}&iv=${signature.iv}`,
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
                    if ((parseInt(req.query.page.toString()) > pages) || (parseInt(req.query.page.toString()) < 1)) { res.redirect(`${getURL(config.config.server.rootDir, req.params.category, req.params.year, req.params.month, req.params.day)}?admin=1&pass=${escape(config.config.adminPassword)}`); return; }
                } else {
                    res.redirect(`${getURL(config.config.server.rootDir, req.params.category, req.params.year, req.params.month, req.params.day)}?admin=1&pass=${escape(config.config.adminPassword)}`);
                    return;
                }
            }

            const url: string = getURL(config.config.server.rootDir, req.params.category, req.params.year, req.params.month, req.params.day);

            res.render('index', {
                meta: {
                    pageTitle: `Page ${(req.query.page) ? req.query.page : '1'} - ${req.params.day}/${req.params.month}/${req.params.year} ${req.params.category} stock`,
                    title: `${req.params.category} (admin)`,
                    date: `${req.params.day}/${req.params.month}/${req.params.year}`,
                    description: `The ${req.params.day}/${req.params.month}/${req.params.year} ${req.params.category} stock with ${(files.length === 1) ? `1 file` : `${files.length} files`} is available now`,
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
                        url: `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${file}`,
                        source: (stats.isDirectory()) ? `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${file}` : `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${file}?source=1&signature=${signature.signature}&iv=${signature.iv}`,
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
                if ((parseInt(req.query.page.toString()) > pages) || (parseInt(req.query.page.toString()) < 1)) { res.redirect(getURL(config.config.server.rootDir, req.params.category, req.params.year, req.params.month, req.params.day)); return; }
            } else {
                res.redirect(getURL(config.config.server.rootDir, req.params.category, req.params.year, req.params.month, req.params.day));
                return;
            }
        }

        const url: string = getURL(config.config.server.rootDir, req.params.category, req.params.year, req.params.month, req.params.day);

        res.render('index', {
            meta: {
                pageTitle: `Page ${(req.query.page) ? req.query.page : '1'} - ${req.params.day}/${req.params.month}/${req.params.year} ${req.params.category} stock`,
                title: req.params.category,
                date: `${req.params.day}/${req.params.month}/${req.params.year}`,
                description: `The ${req.params.day}/${req.params.month}/${req.params.year} ${req.params.category} stock with ${(files.length === 1) ? `1 file` : `${files.length} files`} is available now`,
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
    } catch (err) {
        console.log(err);
        res.status(500).end();
    }
});

router.get(`/${config.config.server.rootDir}/:category/:year/:month/:day/thumbs`, (_req, res) => {
    res.status(404).end();
});

router.get(`/${config.config.server.rootDir}/:category/:year/:month/:day/thumbs/*`, (req, res) => {
    try {
        req.on('error', (err) => {
            if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
            res.status(500).end();
        });

        res.on('error', (err) => {
            if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
            res.status(500).end();
        });

        let dirPath: string | undefined = (req.params as Record<string, string>)[0];
        if (!dirPath || !/(_thumb\.png)$/i.test(dirPath)) { res.status(404).end(); return; }

        const fullPath = path.resolve(`./${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${dirPath.replace(/(_thumb.png)$/i, '')}`);
        if (!fs.existsSync(fullPath) || !fs.lstatSync(fullPath).isFile()) { res.status(404).end(); return; }
        if (!config.config.categories.includes(req.params.category)) { res.status(404).end(); return; }
        if (!req.query.signature || !req.query.iv) { sendForbidden(res); return; }

        let decryptedSignature = decryptSignature(unescape(req.query.signature.toString()), Buffer.from(process.env.KEY!, 'hex'), unescape(req.query.iv.toString()));
        if (!decryptedSignature) { sendForbidden(res); return; }

        const signatureParts = decryptedSignature.split('|');
        if (signatureParts.length !== 2) { sendForbidden(res); return; }
        if (!signatureParts[0] || !signatureParts[1]) { sendForbidden(res); return; }

        if (isInteger(signatureParts[0]) && checkDifference(signatureParts[0], config.config.server.signatureExpiry) && signatureParts[1] === path.parse(fullPath).base) {
            let ffmpeg = childProcess.spawn('ffmpeg',
                [
                    '-i', fullPath,
                    '-ss', '00:00:00',
                    '-q:v', '0',
                    '-frames:v', '1',
                    '-f', 'image2pipe',
                    '-c:v', 'png',
                    '-'
                ]);

            res.status(200).set('Content-Type', 'image/png');

            ffmpeg.stdout.pipe(res);
        } else sendForbidden(res);
    } catch (err) {
        console.log(err);
        res.status(500).end();
    }
});

export default router;