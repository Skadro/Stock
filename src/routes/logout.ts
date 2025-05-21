// External libs
import express, { Router } from 'express';

// Internal libs
import { isInDevelopment } from '../utils/Functions';

/**
 * Logout router
 * 
 * `/logout`: GET
 */
const router: Router = express.Router({ caseSensitive: true });

router.get('/logout', (req, res) => {
    req.on('error', (err) => {
        if (isInDevelopment()) console.log(err);
        res.status(500).end();
    });

    res.on('error', (err) => {
        if (isInDevelopment()) console.log(err);
        res.status(500).end();
    });

    if (req.session.user) {
        req.session.destroy((err) => {
            if (err) {
                if (isInDevelopment()) console.log(err);
                res.status(500).end();
                return;
            }
        });
    }

    res.redirect('/login');
});

export default router;