// External libs
import express, { Router } from 'express';
import path from 'path';
import fs from 'fs';

// Internal libs
import { config } from '../utils/Storage';

/**
 * Year router
 * 
 * `/${config.config.server.rootDir}/:category/:year`
 */
const router: Router = express.Router({ caseSensitive: true });

router.get(`/${config.config.server.rootDir}/:category/:year`, (req, res) => {
    try {
        req.on('error', (err) => {
            if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
            res.status(500).end();
        });

        res.on('error', (err) => {
            if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
            res.status(500).end();
        });

        const fullPath = path.resolve(`./views/${req.params.year}`);
        const filename = path.parse(fullPath).base;
        if (fs.existsSync(fullPath) && (filename === 'index.css' || filename === 'media.css' || filename === 'zoom.js' ||
            filename === 'favicon.ico' || filename === 'stock.jpg' || filename === 'directory.png')) {
            res.status(200).sendFile(fullPath, (err) => {
                if (err) {
                    if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') console.log(err);
                    res.status(500).end();
                }
            });
        } else res.status(404).end();
    } catch (err) {
        console.log(err);
        res.status(500).end();
    }
});

export default router;