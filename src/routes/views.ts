// External libs
import express, { Router } from 'express';
import path from 'path';
import fs from 'fs';

// Internal libs
import { isInDevelopment } from '../utils/Functions';
import { config } from '../utils/Storage';

/**
 * Views router
 * 
 * `/views`: GET
 * 
 * `/views/:file`: GET
 */
const router: Router = express.Router({ caseSensitive: true });

router.get('/views/:file', (req, res) => {
    try {
        req.on('error', (err) => {
            if (isInDevelopment()) console.log(err);
            res.status(500).end();
        });

        res.on('error', (err) => {
            if (isInDevelopment()) console.log(err);
            res.status(500).end();
        });

        const fullPath: string = path.resolve(`./views/${req.params.file}`);
        const filename: string = path.parse(fullPath).base;
        if (fs.existsSync(fullPath) && (config.config.viewsFiles.includes(filename))) {
            res.status(200).sendFile(fullPath, (err) => {
                if (err) {
                    if (isInDevelopment()) console.log(err);
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