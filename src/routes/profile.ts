// External libs
import express, { Router } from 'express';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import mime from 'mime';
import { RowDataPacket } from 'mysql2';

// Internal libs
import { config, mediaRegEx, server } from '../utils/Storage';
import { EncryptedSignature, StockFile, User } from '../utils/Structures';
import { generateSignature, getUser, hashPassword, isInDevelopment, isInteger, isInvalid } from '../utils/Functions';


/**
 * Profile router
 * 
 * `/profile`: GET
 */
const router: Router = express.Router({ caseSensitive: true });

router.get('/profile', (req, res) => {
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
        const userGallery: string = path.resolve(`./${config.config.server.rootDir}/${user.username}/stock`);
        let files: (StockFile | string)[] | undefined = undefined;

        if (fs.existsSync(userGallery)) {
            files = fs.readdirSync(userGallery, 'utf-8');

            if (files.length > 0) {
                if (files.length > 10) files = files.slice(0, 9);
                let key: Buffer = Buffer.from(process.env.KEY!, 'hex');

                const dimensionsPath: string = `${userGallery}/dimensions.txt`;
                let dimensions: string[] | null = null;
                if (fs.existsSync(dimensionsPath)) dimensions = fs.readFileSync(dimensionsPath, 'utf-8').split('\n');

                try {
                    files = (files as string[]).filter((file) => {
                        const stats: fs.Stats = fs.lstatSync(`${userGallery}/${file}`);
                        return stats.isFile() || stats.isDirectory();
                    }).map((file) => {
                        try {
                            const filePath: string = `${userGallery}/${file}`;
                            const stats: fs.Stats = fs.lstatSync(filePath);

                            const signature: EncryptedSignature | null = (!stats.isDirectory()) ? generateSignature(`${Date.now()}|${path.parse(filePath).base}`, key) : null;
                            if (!signature && !stats.isDirectory()) { throw 'Invalid sig'; }

                            let fileDimensions: string | string[] | undefined = undefined;

                            if (dimensions && !stats.isDirectory()) {
                                dimensions.forEach((value) => {
                                    let dimensionsSplit: string[] = value.split(':');
                                    let filename: string | undefined = dimensionsSplit[0];

                                    if (filename && filename === file) {
                                        let dimensions: string[] | null = (dimensionsSplit[1]) ? dimensionsSplit[1].trim().split('/') : null;

                                        if (dimensions && dimensions.length === 2 && isInteger(dimensions[0]!) && isInteger(dimensions[1]!)) fileDimensions = dimensions;
                                    }
                                });
                            }

                            return {
                                url: `/user/${user.username}/stock/${file}`,
                                source: (stats.isDirectory()) ? `/user/${user.username}/stock${file}` : (signature) ? `/user/${user.username}/stock/${file}?source=1&signature=${signature.signature}&iv=${signature.iv}` : null,
                                filename: path.parse(filePath).base,
                                type: { mediaType: (stats.isDirectory()) ? 'directory' : (mediaRegEx.image.test(path.parse(filePath).ext)) ? 'image' : (mediaRegEx.video.test(path.parse(filePath).ext)) ? 'video' : null, contentType: (stats.isDirectory()) ? 'directory' : mime.getType(path.parse(filePath).ext) },
                                width: (fileDimensions) ? fileDimensions[0] : null,
                                height: (fileDimensions) ? fileDimensions[1] : null
                            } as StockFile
                        } catch (err) {
                            throw err;
                        }
                    }).filter((file) => file.type.mediaType && file.type.contentType);

                    if (req.query.filter) files = (files as StockFile[]).filter((file) => req.query.filter!.toString() === file.type.mediaType);
                } catch (err) {
                    files = [];
                    if (err != 'Invalid sig') {
                        throw err;
                    }
                }

                if (files.length > 0) {
                    let dimensionsFile: string = '';

                    (files as StockFile[]).forEach((file, index) => {
                        if (dimensions) if (dimensions.includes(file.filename)) return;

                        let filePath: string = `${userGallery}/${file.filename}`;

                        if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
                            ffmpeg(filePath).ffprobe((err: any, data: ffmpeg.FfprobeData) => {
                                if (err) {
                                    if (isInDevelopment()) console.log(err);
                                    res.status(500).end();
                                    return;
                                }

                                if (data.streams[0]) {
                                    if (data.streams[0].width && data.streams[0].height) {
                                        dimensionsFile += `${file.filename}: ${data.streams[0].width}/${data.streams[0].height}\n`;
                                        if (index == files!.length - 1) fs.writeFileSync(`${userGallery}/dimensions.txt`, dimensionsFile, 'utf-8');
                                    }
                                }
                            });
                        }
                    });
                }
            }
        }

        res.render('profile', {
            user: user,
            viewedUser: null,
            sameUser: true,
            files: (files) ? files : null,
            script: `/views/profile.js`,
            stylesheet: `/views/profile.css`,
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
});

router.route('/profile/edit')
    .get((req, res) => {
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
            res.render('editprofile', {
                user: user,
                script: `/views/editprofile.js`,
                stylesheet: `/views/editprofile.css`,
                favicon: `/views/favicon.ico`
            }, (err: Error, html: string) => {
                if (err) {
                    if (isInDevelopment()) console.log(err);
                    res.status(500).end();
                    return;
                }

                if (html) res.status(200).send(html);
            });
        }
    }).post(express.json(), (req, res) => {
        req.on('error', (err) => {
            if (isInDevelopment()) console.log(err);
            res.status(500).end();
        });

        res.on('error', (err) => {
            if (isInDevelopment()) console.log(err);
            res.status(500).end();
        });

        const currentUser: User | undefined = req.session.user;

        if (currentUser) {
            if (req.body) {
                let { username, email, password, confirm_password, display_name, avatar, bio } = req.body;

                if (server.database) server.database.getConnection((err, connection) => {
                    if (server.database) {
                        if (err) {
                            console.log(err);
                            res.status(500).end();
                            server.database.releaseConnection(connection);
                            return;
                        }

                        connection.query('SELECT * FROM `users` WHERE `user_id`=?', [currentUser.user_id], (err, result) => {
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
                                        const values: (string | number | null)[] = [];
                                        const queryParts: string[] = [];
                                        const changed: { username: boolean, email: boolean, password: boolean | 'unmatched', display_name: boolean, bio: boolean, avatar: boolean | 'invalid' } = {
                                            username: false,
                                            email: false,
                                            password: false,
                                            display_name: false,
                                            bio: false,
                                            avatar: false
                                        };

                                        if (!isInvalid(username) && username !== user.username) { changed.username = true; values.push(username); queryParts.push('`username`=?'); };
                                        if (!isInvalid(email) && email !== user.email) { changed.email = true; values.push(email); queryParts.push('`email`=?'); };

                                        const parts: string[] = user.password!.split('/');
                                        const hashedPassword: string | undefined = parts[0];
                                        const salt: string | undefined = parts[1];

                                        if (!isInvalid(password) && !isInvalid(confirm_password) && hashedPassword && salt && parts.length === 2) {
                                            const newHashedPassword: string = hashPassword(password, salt);
                                            const confirmHashedPassword: string = hashPassword(confirm_password, salt);

                                            if (newHashedPassword !== user.password && confirmHashedPassword !== user.password)
                                                if (newHashedPassword === confirmHashedPassword) { changed.password = true; values.push(newHashedPassword); queryParts.push('`password`=?'); }
                                                else changed.password = 'unmatched';
                                        }

                                        if (!isInvalid(display_name) && display_name !== user.display_name) { changed.display_name = true; values.push(((display_name as string).length > 0) ? display_name : null); queryParts.push('`display_name`=?'); };
                                        if (!isInvalid(bio) && bio !== user.bio) { changed.bio = true; values.push(((bio as string).length > 0) ? bio : null); queryParts.push('`bio`=?'); };

                                        if (!isInvalid(avatar) && avatar !== user.avatar_url) {
                                            if ((avatar as string).length === 0) { changed.avatar = true; values.push(null); queryParts.push('`avatar_url`=?'); }
                                            else if (URL.canParse(avatar)) { changed.avatar = true; values.push(avatar); queryParts.push('`avatar_url`=?'); }
                                            else changed.avatar = 'invalid';
                                        }

                                        if (changed.password === 'unmatched' || changed.avatar === 'invalid') {
                                            res.status(400).json({
                                                ...(changed.password === 'unmatched') ? { password: 'unmatched' } : {},
                                                ...(changed.avatar === 'invalid') ? { avatar: 'invalid' } : {}
                                            }).end();
                                            return;
                                        }

                                        values.push(user.user_id);

                                        connection.query(`UPDATE \`users\` SET ${queryParts.join()} WHERE \`user_id\`=?`, values, (err2, _result2) => {
                                            if (err2) {
                                                console.log(err2);
                                                res.status(500).end();
                                                server.database!.releaseConnection(connection);
                                                return;
                                            }

                                            if (changed.username) req.session.user!.username = username;
                                            if (changed.email) req.session.user!.email = email;
                                            if (changed.display_name) req.session.user!.display_name = ((display_name as string).length > 0) ? display_name : null;
                                            if (changed.bio) req.session.user!.bio = ((bio as string).length > 0) ? bio : null;
                                            if (changed.avatar) req.session.user!.avatar_url = ((avatar as string).length > 0) ? avatar : null;

                                            res.status(200).end();
                                        });
                                    }
                                } else res.status(404).end();
                            } else res.status(404).end();
                        });
                    }

                    server.database!.releaseConnection(connection);
                });
            }
        }
    });

export default router;