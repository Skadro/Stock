// External libs
import express, { Router } from 'express';

// Internal libs
import { isInDevelopment } from '../utils/Functions';
import { User } from '../utils/Structures';

/**
 * Upload router
 * 
 * `/upload`: GET
 */
const router: Router = express.Router({ caseSensitive: true });

router.get('/upload', (req, res) => {
    req.on('error', (err) => {
        if (isInDevelopment()) console.log(err);
        res.status(500).end();
    });

    res.on('error', (err) => {
        if (isInDevelopment()) console.log(err);
        res.status(500).end();
    });

    const user: User | undefined = req.session.user;

    if (user) {
        res.render('upload', {
            user: user,
            script: `/views/upload.js`,
            stylesheet: `/views/upload.css`,
            favicon: `/views/favicon.ico`
        }, (err: Error, html: string) => {
            if (err) {
                if (isInDevelopment()) console.log(err);
                res.status(500).end();
                return;
            }

            if (html) res.status(200).send(html);
        });
    } else res.redirect('/login');
})

export default router;