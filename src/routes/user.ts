// External libs
import express, { Router } from 'express';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import mime from 'mime';

// Internal libs
import { config, mediaRegEx, server } from '../utils/Storage';
import { EncryptedSignature, StockFile, User } from '../utils/Structures';
import { RowDataPacket } from 'mysql2';
import { generateSignature, getUser, isInDevelopment, isInteger } from '../utils/Functions';

/**
 * User router
 * 
 * `/user/:username`: GET
 */
const router: Router = express.Router({ caseSensitive: true });

router.get('/user/:username', (req, res) => {
    req.on('error', (err) => {
        if (isInDevelopment()) console.log(err);
        res.status(500).end();
    });

    res.on('error', (err) => {
        if (isInDevelopment()) console.log(err);
        res.status(500).end();
    });

    const user: User | undefined = req.session.user;
    const username: string = req.params.username;

    if (user && username) {
        if (server.database) server.database.getConnection((err, connection) => {
            if (server.database) {
                if (err) {
                    console.log(err);
                    server.database.releaseConnection(connection);
                    return;
                }

                connection.query('SELECT * FROM `users` WHERE `username`=?', [username], (err, result) => {
                    if (err) {
                        console.log(err);
                        server.database!.releaseConnection(connection);
                        return;
                    }

                    if (Array.isArray(result)) {
                        const resultUser: RowDataPacket | undefined = (result as RowDataPacket[])[0];

                        if (resultUser) {
                            const user: User | undefined = getUser(resultUser);

                            if (user) {
                                const userGallery: string = path.resolve(`./${config.config.server.rootDir}/${resultUser.username}/stock`);
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
                                                        url: `/user/${resultUser.username}/stock/${file}`,
                                                        source: (stats.isDirectory()) ? `/user/${resultUser.username}/stock${file}` : (signature) ? `/user/${resultUser.username}/stock/${file}?source=1&signature=${signature.signature}&iv=${signature.iv}` : null,
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

                                const viewedUser: User = { user_id: resultUser.user_id, username: resultUser.username, email: resultUser.email, display_name: resultUser.display_name, bio: resultUser.bio, avatar_url: resultUser.avatar_url, admin: resultUser.admin, creation_date: resultUser.creation_date, last_active: resultUser.last_active };

                                res.render('profile', {
                                    user: user,
                                    viewedUser: viewedUser,
                                    sameUser: user.user_id === viewedUser.user_id,
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
                            } else res.status(500).end();
                        } else res.status(404).end();
                    } else res.status(404).end();
                });
            }

            server.database!.releaseConnection(connection);
        });
    } else res.redirect('/login');
});

export default router;