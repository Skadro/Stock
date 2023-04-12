// External libs
import express, { Router } from 'express';
import path from 'path';
import fs from 'fs';
import mime from 'mime';

// Internal libs
import { config } from '../utils/Storage';
import { generateSignature, getURLPort, getURLProtocol } from '../utils/Functions';
import { StockFile } from '../utils/Structures';

/**
 * Day router
 * 
 * `/${config.config.server.rootDir}/:category/:year/:month/:day`
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

        let files: (StockFile | string)[] = fs.readdirSync(fullPath, 'utf8');
        if (files.length > config.config.maxFilesPerDay) { res.status(404).send('Max files per day exceeded').end(); return; }

        let key: Buffer = Buffer.from(fs.readFileSync(path.resolve('./signature/key'), 'utf8'), 'hex');

        try {
            files = (files as string[]).filter((file) => fs.lstatSync(`${fullPath}/${file}`).isFile()).map((file) => {
                try {
                    let signature = generateSignature(`${Date.now()}|${path.parse(`${fullPath}/${file}`).base}`, key);
                    if (!signature) { throw 'Invalid sig'; }

                    return {
                        url: `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${file}`,
                        path: `/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${file}?source=1&signature=${signature.signature}&iv=${signature.iv}`, filename: path.parse(`${fullPath}/${file}`).base,
                        type: { mediaType: (/^\.(apng|avif|bmp|gif|ico|jpe|jpeg|jpg|png|webp)$/i.test(path.parse(`${req.params.day}/${file}`).ext)) ? 'image' : (/^\.(mp4|webm)$/i.test(path.parse(`${req.params.day}/${file}`).ext)) ? 'video' : null, contentType: mime.getType(path.parse(`${req.params.day}/${file}`).ext) }
                    }
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
        if (files.length === 0) { res.status(404).send('No files available').end(); return; }

        (files as StockFile[]).sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' }));

        const pages = Math.ceil(files.length / config.config.filesPerPage);

        if (req.query.page) {
            if (!Number.isNaN(Number(req.query.page)) && Number.isSafeInteger(Number(req.query.page))) {
                if ((Number(req.query.page) > pages) || (Number(req.query.page) < 1)) { res.redirect(`${getURLProtocol()}://${config.config.server.domain}${getURLPort(config.config.server.port)}/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}`); return; }
            } else {
                res.redirect(`${getURLProtocol()}://${config.config.server.domain}${getURLPort(config.config.server.port)}/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}`);
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
                url: `${getURLProtocol()}://${config.config.server.domain}${getURLPort(config.config.server.port)}/${config.config.server.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}`
            },
            stylesheet: `/${config.config.server.rootDir}/views/index.css`,
            favicon: `/${config.config.server.rootDir}/views/favicon.ico`,
            files: files,
            filesPerPage: config.config.filesPerPage,
            page: req.query.page || 1
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

export default router;