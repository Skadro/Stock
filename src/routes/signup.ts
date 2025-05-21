// External libs
import express, { Router } from 'express';
import { RowDataPacket } from 'mysql2';
import fs from 'fs';
import path from 'path';

// Internal libs
import { config, server } from '../utils/Storage';
import { getUser, hashPassword, isInDevelopment } from '../utils/Functions';
import { User } from '../utils/Structures';


/**
 * Signup router
 * 
 * `/signup`: GET, SEARCH, POST
 */
const router: Router = express.Router({ caseSensitive: true });

router.route(`/signup`)
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

        res.render('signup', {
            stylesheet: `/views/formsin.css`,
            favicon: `/views/favicon.ico`,
            script: `/views/signup.js`
        }, (err: Error, html: string) => {
            if (err) {
                if (isInDevelopment()) console.log(err);
                res.status(500).end();
                return;
            }

            if (html) res.status(200).send(html);
        });
    })
    .search(express.json(), (req, res) => {
        req.on('error', (err) => {
            if (isInDevelopment()) console.log(err);
            res.status(500).end();
        });

        res.on('error', (err) => {
            if (isInDevelopment()) console.log(err);
            res.status(500).end();
        });

        if (req.body) {
            const { username, email, password } = req.body;

            if ((username && email && password) && (typeof username === 'string' && typeof email === 'string' && typeof password === 'string')) {
                if (server.database) server.database.getConnection((err, connection) => {
                    if (server.database) {
                        if (err) {
                            console.log(err);
                            server.database.releaseConnection(connection);
                            return;
                        }

                        connection.query('SELECT * FROM `users` WHERE `username`=? OR `email`=?', [username, email], (err, result) => {
                            if (err) {
                                console.log(err);
                                server.database!.releaseConnection(connection);
                                return;
                            }

                            let userExists: boolean = false;

                            if (Array.isArray(result)) {
                                if (result.length > 0) userExists = true;
                            } else if (result.fieldCount > 0) userExists = true;

                            if (userExists) res.status(200).send('found').end();
                            else res.status(200).send('notfound').end();
                        });

                    }

                    server.database!.releaseConnection(connection);
                });
            }
        }


    })
    .post(express.json(), async (req, res) => {
        try {
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

                let { username, email, password } = req.body;

                if ((username && email && password) && (typeof username === 'string' && typeof email === 'string' && typeof password === 'string')) {
                    password = hashPassword(password);

                    if (server.database) server.database.getConnection((err, connection) => {
                        if (server.database) {
                            if (err) {
                                console.log(err);
                                server.database.releaseConnection(connection);
                                return;
                            }

                            connection.query('INSERT INTO `users`(`username`, `email`, `password`) VALUES (?,?,?)', [username, email, password], (err, _result) => {
                                if (err) {
                                    console.log(err);
                                    res.status(500).end();
                                    server.database!.releaseConnection(connection);
                                    return;
                                }
                            });

                            connection.query('SELECT * FROM `users` WHERE `username`=? OR `email`=?', [username, email], (err, result) => {
                                if (err) {
                                    console.log(err);
                                    res.status(500).end();
                                    server.database!.releaseConnection(connection);
                                    return;
                                }

                                if (Array.isArray(result)) {
                                    const resultUser: RowDataPacket | undefined = (result as RowDataPacket[])[0];

                                    if (resultUser) {
                                        const user: User | undefined = getUser(resultUser);

                                        if (user) {
                                            req.session.user = {
                                                user_id: user.user_id,
                                                username: username,
                                                email: email,
                                                display_name: null,
                                                bio: null,
                                                avatar_url: null,
                                                admin: false,
                                                creation_date: Date.now(),
                                                last_active: Date.now(),
                                                expire: Date.now() + 2419200000
                                            }

                                            req.session.save((err) => {
                                                if (err) console.log(err);
                                            });

                                            let userStock: string = path.resolve(`./${config.config.server.rootDir}/${user.username}/stock`);

                                            if (!fs.existsSync(userStock)) fs.mkdirSync(userStock, { recursive: true });

                                            res.status(200).end();
                                        } else res.status(500).end();
                                    } else res.status(500).end();
                                } else res.status(500).end();
                            });
                        }

                        server.database!.releaseConnection(connection);
                    });
                }
            }
        } catch (err) {
            console.log(err);
            res.status(500).end();
        }
    });

export default router;