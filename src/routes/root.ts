// External libs
import express, { Router } from 'express';

// Internal libs
import { config } from '../utils/Storage';

/**
 * Root router
 * 
 * `/`
 * 
 * `/${config.config.server.rootDir}`
 */
const router: Router = express.Router({ caseSensitive: true });

router.get('/', (_req, res) => {
    res.status(404).end();
});

router.get(`/${config.config.server.rootDir}`, (_req, res) => {
    res.status(404).end();
});

export default router;