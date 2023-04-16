// External libs
import express, { Router } from 'express';

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
    res.type('text/plain');
    res.send('User-agent: *\nDisallow: /\n').end();
});

router.get(`/${config.config.server.rootDir}`, (_req, res) => {
    res.status(404).end();
});

export default router;