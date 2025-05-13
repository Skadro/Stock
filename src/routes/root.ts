// External libs
import express, { Router } from 'express';
import fs from 'fs';
import path from 'path';

// Internal libs
import { User } from '../utils/Structures';
import { isInDevelopment } from '../utils/Functions';

declare module 'express-session' {
    interface SessionData {
        user: User;
    }
}

/**
 * Root router
 * 
 * `/`: GET
 * 
 * `/robots.txt`: GET
 */
const router: Router = express.Router({ caseSensitive: true });

router.get('/', (req, res) => {
    if (req.session.user) res.redirect('/profile');
    else res.redirect('/login');
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
        if (isInDevelopment()) console.log(err);
        res.status(500).end();
    }
});

export default router;