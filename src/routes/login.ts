// External libs
import express, { Router } from 'express';
import { RowDataPacket } from 'mysql2';

// Internal libs
import { server } from '../utils/Storage';
import { getUser, hashPassword, isInDevelopment } from '../utils/Functions';
import { User } from '../utils/Structures';

/**
 * Login router
 * 
 * `/login`: GET, POST
 */
const router: Router = express.Router({ caseSensitive: true });

router.route('/login')
    .get((req, res) => {
        req.on('error', (err) => {
            if (isInDevelopment()) console.log(err);
            res.status(500).end();
        });

        res.on('error', (err) => {
            if (isInDevelopment()) console.log(err);
            res.status(500).end();
        });

        if (req.session.user) { res.redirect('/profile'); return; }

        res.render('login', {
            stylesheet: `/views/formsin.css`,
            favicon: `/views/favicon.ico`,
            script: `/views/login.js`
        }, (err: Error, html: string) => {
            if (err) {
                if (isInDevelopment()) console.log(err);
                res.status(500).end();
                return;
            }

            if (html) res.status(200).send(html);
        });
    }).post(express.json(), (req, res) => {
        req.on('error', (err) => {
            if (isInDevelopment()) console.log(err);
            res.status(500).end();
        });

        res.on('error', (err) => {
            if (isInDevelopment()) console.log(err);
            res.status(500).end();
        });

        if (req.body) {
            if (req.session.user) { res.status(100).end(); return; }

            let { username_email, password } = req.body;

            if ((username_email && password) && (typeof username_email === 'string' && typeof password === 'string')) {
                if (server.database) server.database.getConnection((err, connection) => {
                    if (server.database) {
                        if (err) {
                            console.log(err);
                            server.database.releaseConnection(connection);
                            return;
                        }

                        connection.query('SELECT * FROM `users` WHERE `username`=? OR `email`=?', [username_email, username_email], (err, result) => {
                            if (err) {
                                console.log(err);
                                server.database!.releaseConnection(connection);
                                return;
                            }

                            if (Array.isArray(result)) {
                                const resultUser: RowDataPacket | undefined = (result as RowDataPacket[])[0];

                                if (resultUser) {
                                    const user: User | undefined = getUser(resultUser, true);

                                    if (user) {
                                        if (user.password) {
                                            const parts: string[] = user.password.split('/');
                                            const salt: string | undefined = parts[1];

                                            if (salt && parts.length === 2) {
                                                const hashedSubmittedPassword: string = hashPassword(password, salt);

                                                if (hashedSubmittedPassword === user.password) {
                                                    req.session.user = {
                                                        user_id: user.user_id,
                                                        username: user.username,
                                                        email: user.email,
                                                        display_name: (user.display_name && typeof user.display_name === 'string') ? user.display_name : null,
                                                        bio: (user.bio && typeof user.bio === 'string') ? user.bio : null,
                                                        avatar_url: (user.avatar_url && typeof user.avatar_url === 'string') ? user.avatar_url : null,
                                                        admin: user.admin,
                                                        creation_date: user.creation_date,
                                                        last_active: Date.now(),
                                                        expire: Date.now() + 2419200000
                                                    }

                                                    req.session.save((err) => {
                                                        if (err) console.log(err);
                                                    });

                                                    res.status(200).send('found').end();
                                                } else res.status(200).send('notfound').end();
                                            }
                                        }
                                    }
                                } else res.status(200).send('notfound').end();
                            } else res.status(200).send('notfound').end();
                        });
                    }

                    server.database!.releaseConnection(connection);
                });
            }
        }
    });

export default router;