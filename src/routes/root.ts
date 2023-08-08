// External libs
import express, { Router } from 'express';
import fs from 'fs';
import path from 'path';

// Internal libs
import { config } from '../utils/Storage';

/**
 * Root router
 * 
 * `/`
 * 
 * `/robots.txt`
 * 
 * `/${config.config.server.rootDir}`
 */
const router: Router = express.Router({ caseSensitive: true });

router.get('/', (_req, res) => {
    res.status(404).end();
});

router.get('/robots.txt', (_req, res) => {
    try {
        const robotsFilePath = path.resolve('./views/robots.txt');
        if (fs.existsSync(robotsFilePath)) {
            const robots = fs.readFileSync(robotsFilePath, 'ascii');
            if (robots.length > 0) res.type('text/plain').send(robots).end();
            else res.status(404).end();
        } else res.status(404).end();
    } catch (err) {
        if (process.env.NODE_ENV === 'development') console.log(err);
        res.status(500).end();
    }
});


router.get(`/${config.config.server.rootDir}`, (_req, res) => {
    res.status(404).end();
});

export default router;