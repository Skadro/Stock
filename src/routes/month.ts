// External libs
import express, { Router } from 'express';

// Internal libs
import { config } from '../utils/Storage';

/**
 * Month router
 * 
 * `/${config.config.server.rootDir}/:category/:year/:month`
 */
const router: Router = express.Router({ caseSensitive: true });

router.get(`/${config.config.server.rootDir}/:category/:year/:month`, (_req, res) => {
    res.status(404).end();
});

export default router;