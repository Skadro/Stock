// External libs
import express, { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { Unzip } from 'zip-lib';
import mime from 'mime';
import { RowDataPacket } from 'mysql2';

// Internal libs
import { config, mediaRegEx, server } from '../utils/Storage';
import { EncryptedSignature, StockFile, User } from '../utils/Structures';
import { checkTimeDifference, checkFileExtention, decryptSignature, generateSignature, getURL, isInDevelopment, isInteger, sendForbidden, isInvalid } from '../utils/Functions';

const upload: multer.Multer = multer({
    limits: {
        fileSize: 2000000000,
        files: 500
    },
    preservePath: true,
    fileFilter: (req, file, callback) => {
        if (req.method === 'DELETE') { callback(null, true); return; }
        const ext: string = path.parse(file.originalname).ext;

        if (checkFileExtention(ext, true)) callback(null, true);
        else callback(new Error('Invalid file type'));
    }
});

const unzip = new Unzip({
    overwrite: false,
    symlinkAsFileOnWindows: false,
    onEntry: function (event) {
        const ext: string = path.parse(event.entryName).ext;

        if (!checkFileExtention(ext, false)) event.preventDefault();
    }
});

/**
 * Stock router
 * 
 * `/stock`: GET, POST
 * 
 * `/stock/*`: GET
 * 
 * `/user/:username/stock`: GET
 * 
 * `/user/:username/stock/*`: GET
 */
const router: Router = express.Router({ caseSensitive: true });

router.route('/stock')
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
            const userStock: string = path.resolve(`./${config.config.server.rootDir}/${user.username}/stock`);

            const dimensionsPath: string = `${userStock}/dimensions.txt`;
            let dimensions: string[] | null = null;

            if (fs.existsSync(dimensionsPath)) dimensions = fs.readFileSync(dimensionsPath, 'utf-8').split('\n');

            if (fs.existsSync(userStock)) {
                const url: string = getURL('user', user.username, 'stock');

                if (server.database) server.database.getConnection((err, connection) => {
                    if (server.database) {
                        if (err) {
                            console.log(err);
                            server.database.releaseConnection(connection);
                            return;
                        }

                        connection.query('SELECT * FROM `users` WHERE `username`=?', [user.username], (err, result) => {
                            if (err) {
                                console.log(err);
                                server.database!.releaseConnection(connection);
                                return;
                            }

                            if (Array.isArray(result)) {
                                const user: RowDataPacket | undefined = (result as RowDataPacket[])[0];

                                if (user) {
                                    let files: (StockFile | string)[] = fs.readdirSync(userStock, 'utf-8');
                                    let key: Buffer = Buffer.from(process.env.KEY!, 'hex');

                                    try {
                                        files = (files as string[]).filter((file) => {
                                            const stats: fs.Stats = fs.lstatSync(`${userStock}/${file}`);
                                            return stats.isFile() || stats.isDirectory();
                                        }).map((file) => {
                                            try {
                                                const filePath: string = `${userStock}/${file}`;
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
                                                    url: `/stock/${file}`,
                                                    source: (stats.isDirectory()) ? `/stock/${file}` : (signature) ? `/stock/${file}?source=1&signature=${signature.signature}&iv=${signature.iv}` : null,
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

                                            let filePath: string = `${userStock}/${file.filename}`;

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
                                                            if (index == files.length - 1) fs.writeFileSync(`${userStock}/dimensions.txt`, dimensionsFile, 'utf-8');
                                                        }
                                                    }
                                                });
                                            }
                                        });
                                    }

                                    res.render('stock', {
                                        meta: {
                                            pageTitle: `My stock`,
                                            title: `My stock`,
                                            siteName: 'Stock',
                                            url: url,
                                            image: user.avatar_url,
                                            oEmbed: `${getURL()}/oembed?url=${escape(url)}`
                                        },
                                        stylesheet: `/views/stock.css`,
                                        favicon: `/views/favicon.ico`,
                                        directoryIcon: `/views/directory.png`,
                                        files: files,
                                        filesPerPage: config.config.filesPerPage,
                                        page: (req.query.page) ? parseInt(req.query.page.toString()) : 1,
                                        adminPassword: (req.query.admin && req.query.admin.toString() === '1') ? config.config.adminPassword : null,
                                        secured: process.env.TLS_CERT && process.env.TLS_KEY
                                    }, (err: Error, html: string) => {
                                        if (err) {
                                            if (isInDevelopment()) console.log(err);
                                            res.status(500).end();
                                            return;
                                        }

                                        if (html) res.status(200).send(html);
                                    });
                                } else res.status(404).end();
                            } else res.status(404).end();
                        });
                    } else res.status(500).end();

                    server.database!.releaseConnection(connection);
                });
                else res.status(500).end();
            } else res.status(404).end();
        } else res.redirect('/login');
    })
    .post(upload.array('media', 500), (req, res) => {
        const user: User | undefined = req.session.user;

        if (user) {
            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                const userGallery: string = path.resolve(`./${config.config.server.rootDir}/${user.username}/stock`);
                if (!fs.existsSync(userGallery)) fs.mkdirSync(userGallery, { recursive: true });

                req.files.forEach(async (file) => {
                    const nameExt: path.ParsedPath = path.parse(file.originalname);
                    const name: string = nameExt.name.trim();
                    const ext: string = nameExt.ext.trim().toLowerCase();
                    const filePath: string = `${userGallery}/${file.originalname}`;

                    fs.writeFileSync(filePath, file.buffer);

                    if (ext === '.zip') {
                        const targetPath: string = `${userGallery}/${name}`;

                        await unzip.extract(filePath, targetPath).then(() => fs.rmSync(filePath)).catch((err) => {
                            console.log(err);
                            fs.rmSync(filePath);
                            res.status(500).end();
                        });
                    }
                });

                if (res.statusCode !== 500) res.status(201).end();
            } else res.status(400).end();
        } else res.status(401).end();
    })
    .delete(express.text(), (req, res) => {
        const user: User | undefined = req.session.user;

        console.log(user);

        if (user) {
            if (!isInvalid(req.body) && typeof req.body === 'string') {
                let filePath: string = new URL(req.body).pathname;
                let pathNameParts: string[] = filePath.split('/');
                let filename: string | undefined = pathNameParts[pathNameParts.length - 1];

                console.log(filename)

                if (filename) {
                    let fullPath: string = path.resolve(`./${config.config.server.rootDir}/${user.username}/stock/${filename}`);

                    console.log(fullPath);

                    fs.rmSync(fullPath, { force: true });

                    res.status(200).end();
                }
            } else res.status(400).end();
        } else res.status(403).end();
    });

router.get('/stock/*', (req, res) => {
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
        let fullPath: string = path.resolve(`./${config.config.server.rootDir}/${user.username}/stock`);
        let dirPath: string | undefined = (req.params as Record<string, string>)[0];
        if (dirPath) fullPath += `/${dirPath}`;

        if (!fs.existsSync(fullPath)) {
            if (req.query.source && req.query.source.toString() === '1') {
                sendForbidden(res);
                return;
            }

            res.status(404).end();
            return;
        }

        let stats: fs.Stats = fs.lstatSync(fullPath);
        let type = (stats.isDirectory()) ? 'directory' : mime.getType(path.parse(fullPath).ext);
        let mediaType = (stats.isDirectory()) ? 'directory' : (mediaRegEx.image.test(path.parse(fullPath).ext)) ? 'image' : (mediaRegEx.video.test(path.parse(fullPath).ext)) ? 'video' : null;

        if (type === 'directory' && mediaType === 'directory') {
            let files: (StockFile | string)[] = fs.readdirSync(fullPath, 'utf-8');

            const dimensionsPath: string = `${fullPath}/dimensions.txt`;
            let dimensions: string[] | null = null;

            if (fs.existsSync(dimensionsPath)) dimensions = fs.readFileSync(dimensionsPath, 'utf-8').split('\n');

            let key: Buffer = Buffer.from(process.env.KEY!, 'hex');

            try {
                files = (files as string[]).filter((file) => {
                    const stats: fs.Stats = fs.lstatSync(`${fullPath}/${file}`);
                    return stats.isFile() || stats.isDirectory();
                }).map((file) => {
                    try {
                        const filePath: string = `${fullPath}/${file}`;
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
                            url: `/stock/${dirPath}/${file}`,
                            source: (stats.isDirectory()) ? `/stock/${dirPath}/${file}` : (signature) ? `/stock/${dirPath}/${file}?source=1&signature=${signature.signature}&iv=${signature.iv}` : null,
                            filename: path.parse(filePath).base,
                            type: { mediaType: (stats.isDirectory()) ? 'directory' : (mediaRegEx.image.test(path.parse(filePath).ext)) ? 'image' : (mediaRegEx.video.test(path.parse(filePath).ext)) ? 'video' : null, contentType: (stats.isDirectory()) ? 'directory' : mime.getType(path.parse(filePath).ext) },
                            width: (fileDimensions) ? fileDimensions[0]! : null,
                            height: (fileDimensions) ? fileDimensions[1]! : null
                        } as StockFile
                    } catch (err) {
                        throw err;
                    }
                }).filter((file) => file.type.mediaType && file.type.contentType);
            } catch (err) {
                files = [];
                if (err != 'Invalid sig') {
                    throw err;
                }
            }

            if (files.length === 0) { res.status(404).send('No files available').end(); return; }

            (files as StockFile[]).sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' }));

            const pages: number = Math.ceil(files.length / config.config.filesPerPage);
            const url: string = getURL('stock', dirPath);

            if (req.query.page) {
                if (isInteger(req.query.page.toString())) {
                    if ((parseInt(req.query.page.toString()) > pages) || (parseInt(req.query.page.toString()) < 1)) {
                        if (req.query.admin && req.query.admin.toString() === '1') res.redirect(`${url}?admin=1&pass=${escape(config.config.adminPassword)}`);
                        else res.redirect(url);
                        return;
                    }
                } else {
                    if (req.query.admin && req.query.admin.toString() === '1') res.redirect(`${url}?admin=1&pass=${escape(config.config.adminPassword)}`);
                    else res.redirect(url);
                    return;
                }
            }

            if (files.length > 0) {
                let dimensionsFile: string = '';

                (files as StockFile[]).forEach((file, index) => {
                    if (dimensions) if (dimensions.includes(file.filename)) return;

                    let filePath: string = `${fullPath}/${file.filename}`;

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
                                    if (index == files.length - 1) fs.writeFileSync(`${fullPath}/dimensions.txt`, dimensionsFile, 'utf-8');
                                }
                            }
                        });
                    }
                });
            }

            res.render('stock', {
                meta: {
                    pageTitle: `My stock`,
                    title: `My stock - ${dirPath}`,
                    siteName: 'Stock',
                    author: user.username,
                    url: url,
                    image: user.avatar_url,
                    oEmbed: `${getURL()}/oembed?url=${escape(url)}`
                },
                stylesheet: `/views/stock.css`,
                favicon: `/views/favicon.ico`,
                directoryIcon: `/views/directory.png`,
                files: files,
                filesPerPage: config.config.filesPerPage,
                page: (req.query.page) ? parseInt(req.query.page.toString()) : 1,
                adminPassword: (req.query.admin && req.query.admin.toString() === '1') ? config.config.adminPassword : null,
                secured: process.env.TLS_CERT && process.env.TLS_KEY,
                sameUser: true
            }, (err: Error, html: string) => {
                if (err) {
                    if (isInDevelopment()) console.log(err);
                    res.status(500).end();
                    return;
                }

                if (html) res.status(200).send(html);
            });
        } else {
            if (type && mediaType) {
                let filenameParts = dirPath!.split('/');
                let filename = filenameParts[filenameParts.length - 1];
                if (!filename) { res.status(404).end(); return; }

                ffmpeg(fullPath).ffprobe((err, data) => {
                    if (err) {
                        if (isInDevelopment()) console.log(err);
                        res.status(500).end();
                        return;
                    }

                    if (data.streams[0]) {
                        if (data.streams[0].width && data.streams[0].height) {
                            if (req.query.source && req.query.source.toString() === '1') {
                                if (req.query.signature && req.query.iv) {
                                    let decryptedSignature = decryptSignature(unescape(req.query.signature.toString()), Buffer.from(process.env.KEY!, 'hex'), unescape(req.query.iv.toString()));
                                    if (!decryptedSignature) { sendForbidden(res); return; }

                                    const signatureParts = decryptedSignature.split('|');
                                    if (signatureParts.length !== 2) { sendForbidden(res); return; }
                                    if (!signatureParts[0] || !signatureParts[1]) { sendForbidden(res); return; }

                                    if (isInteger(signatureParts[0]) && checkTimeDifference(signatureParts[0], config.config.server.signatureExpiry) && signatureParts[1] === path.parse(fullPath).base) {
                                        res.set('Content-Type', type!);
                                        res.status(200).sendFile(fullPath, (err) => {
                                            if (err) {
                                                if (isInDevelopment()) console.log(err);
                                                res.status(500).end();
                                            }
                                        });
                                    } else {
                                        sendForbidden(res);
                                        return;
                                    }
                                } else {
                                    sendForbidden(res);
                                    return;
                                }
                            } else {
                                const url = getURL('stock', dirPath);

                                if (req.query.signature || req.query.iv) {
                                    res.redirect(url);
                                    return;
                                }

                                const signature = generateSignature(`${Date.now()}|${path.parse(fullPath).base}`, Buffer.from(process.env.KEY!, 'hex'));
                                if (!signature) { res.status(500).end(); return; }

                                let dir: string[] | string = dirPath!.split('/');
                                dir.pop();
                                dir = dir.join('/');

                                res.render('media', {
                                    meta: {
                                        title: `${filename} (${data.streams[0].width}x${data.streams[0].height})`,
                                        filename: filename,
                                        mediaType: mediaType,
                                        contentType: type,
                                        width: data.streams[0].width,
                                        height: data.streams[0].height,
                                        url: url,
                                        stockURL: getURL('stock'),
                                        siteName: 'Stock',
                                        mediaURL: `${url}?source=1&signature=${escape(signature.signature)}&iv=${escape(signature.iv)}`,
                                        thumbnail: `${getURL('stock', dirPath)}?signature=${escape(signature.signature)}&iv=${escape(signature.iv)}`,
                                        oEmbed: `${getURL()}/oembed?url=${escape(url)}`,
                                    },
                                    stylesheet: '/views/media.css',
                                    favicon: '/views/favicon.ico',
                                    script: '/views/media.js',
                                    secured: process.env.TLS_CERT && process.env.TLS_KEY,
                                    sameUser: true
                                }, (err: Error, html: string) => {
                                    if (err) {
                                        if (isInDevelopment()) console.log(err);
                                        res.status(500).end();
                                        return;
                                    }

                                    if (html) res.status(200).send(html);
                                });
                            }
                        } else res.status(404).end();
                    } else res.status(404).end();
                });
            } else res.status(404).end();
        }
    } else res.redirect('/login');
});

router.get('/user/:username/stock', (req, res) => {
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
        const userStock: string = path.resolve(`./${config.config.server.rootDir}/${username}/stock`);

        const dimensionsPath: string = `${userStock}/dimensions.txt`;
        let dimensions: string[] | null = null;

        if (fs.existsSync(dimensionsPath)) dimensions = fs.readFileSync(dimensionsPath, 'utf-8').split('\n');

        if (fs.existsSync(userStock)) {
            const url: string = getURL('user', username, 'stock');

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
                            const user: RowDataPacket | undefined = (result as RowDataPacket[])[0];

                            if (user) {
                                let files: (StockFile | string)[] = fs.readdirSync(userStock, 'utf-8');
                                let key: Buffer = Buffer.from(process.env.KEY!, 'hex');

                                try {
                                    files = (files as string[]).filter((file) => {
                                        const stats: fs.Stats = fs.lstatSync(`${userStock}/${file}`);
                                        return stats.isFile() || stats.isDirectory();
                                    }).map((file) => {
                                        try {
                                            const filePath: string = `${userStock}/${file}`;
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
                                                url: `/user/${username}/stock/${file}`,
                                                source: (stats.isDirectory()) ? `/user/${username}/stock/${file}` : (signature) ? `/user/${username}/stock/${file}?source=1&signature=${signature.signature}&iv=${signature.iv}` : null,
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

                                        let filePath: string = `${userStock}/${file.filename}`;

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
                                                        if (index == files.length - 1) fs.writeFileSync(`${userStock}/dimensions.txt`, dimensionsFile, 'utf-8');
                                                    }
                                                }
                                            });
                                        }
                                    });
                                }

                                res.render('stock', {
                                    meta: {
                                        pageTitle: `${username}'s stock`,
                                        title: `${username}'s stock`,
                                        siteName: 'Stock',
                                        url: url,
                                        image: user.avatar_url,
                                        oEmbed: `${getURL()}/oembed?url=${escape(url)}`
                                    },
                                    stylesheet: `/views/stock.css`,
                                    favicon: `/views/favicon.ico`,
                                    directoryIcon: `/views/directory.png`,
                                    files: files,
                                    filesPerPage: config.config.filesPerPage,
                                    page: (req.query.page) ? parseInt(req.query.page.toString()) : 1,
                                    adminPassword: (req.query.admin && req.query.admin.toString() === '1') ? config.config.adminPassword : null,
                                    secured: process.env.TLS_CERT && process.env.TLS_KEY,
                                    sameUser: false
                                }, (err: Error, html: string) => {
                                    if (err) {
                                        if (isInDevelopment()) console.log(err);
                                        res.status(500).end();
                                        return;
                                    }

                                    if (html) res.status(200).send(html);
                                });
                            } else res.status(404).end();
                        } else res.status(404).end();
                    });
                } else res.status(500).end();

                server.database!.releaseConnection(connection);
            });
            else res.status(500).end();
        } else res.status(404).end();
    } else res.redirect('/login');
});

router.get('/user/:username/stock/*', (req, res) => {
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

    if (user) {
        let fullPath: string = path.resolve(`./${config.config.server.rootDir}/${username}/stock`);
        let dirPath: string | undefined = (req.params as Record<string, string>)[0];
        if (dirPath) fullPath += `/${dirPath}`;

        if (!fs.existsSync(fullPath)) {
            if (req.query.source && req.query.source.toString() === '1') {
                sendForbidden(res);
                return;
            }

            res.status(404).end();
            return;
        }

        let stats: fs.Stats = fs.lstatSync(fullPath);
        let type = (stats.isDirectory()) ? 'directory' : mime.getType(path.parse(fullPath).ext);
        let mediaType = (stats.isDirectory()) ? 'directory' : (mediaRegEx.image.test(path.parse(fullPath).ext)) ? 'image' : (mediaRegEx.video.test(path.parse(fullPath).ext)) ? 'video' : null;

        if (type === 'directory' && mediaType === 'directory') {
            let files: (StockFile | string)[] = fs.readdirSync(fullPath, 'utf-8');

            const dimensionsPath: string = `${fullPath}/dimensions.txt`;
            let dimensions: string[] | null = null;

            if (fs.existsSync(dimensionsPath)) dimensions = fs.readFileSync(dimensionsPath, 'utf-8').split('\n');

            let key: Buffer = Buffer.from(process.env.KEY!, 'hex');

            try {
                files = (files as string[]).filter((file) => {
                    const stats: fs.Stats = fs.lstatSync(`${fullPath}/${file}`);
                    return stats.isFile() || stats.isDirectory();
                }).map((file) => {
                    try {
                        const filePath: string = `${fullPath}/${file}`;
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
                            url: `/user/${username}/stock/${dirPath}/${file}`,
                            source: (stats.isDirectory()) ? `/user/${username}/stock/${dirPath}/${file}` : (signature) ? `/user/${username}/stock/${dirPath}/${file}?source=1&signature=${signature.signature}&iv=${signature.iv}` : null,
                            filename: path.parse(filePath).base,
                            type: { mediaType: (stats.isDirectory()) ? 'directory' : (mediaRegEx.image.test(path.parse(filePath).ext)) ? 'image' : (mediaRegEx.video.test(path.parse(filePath).ext)) ? 'video' : null, contentType: (stats.isDirectory()) ? 'directory' : mime.getType(path.parse(filePath).ext) },
                            width: (fileDimensions) ? fileDimensions[0]! : null,
                            height: (fileDimensions) ? fileDimensions[1]! : null
                        } as StockFile
                    } catch (err) {
                        throw err;
                    }
                }).filter((file) => file.type.mediaType && file.type.contentType);
            } catch (err) {
                files = [];
                if (err != 'Invalid sig') {
                    throw err;
                }
            }

            if (files.length === 0) { res.status(404).send('No files available').end(); return; }

            (files as StockFile[]).sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' }));

            const pages: number = Math.ceil(files.length / config.config.filesPerPage);
            const url: string = getURL('user', username, 'stock', dirPath);

            if (req.query.page) {
                if (isInteger(req.query.page.toString())) {
                    if ((parseInt(req.query.page.toString()) > pages) || (parseInt(req.query.page.toString()) < 1)) {
                        if (req.query.admin && req.query.admin.toString() === '1') res.redirect(`${url}?admin=1&pass=${escape(config.config.adminPassword)}`);
                        else res.redirect(url);
                        return;
                    }
                } else {
                    if (req.query.admin && req.query.admin.toString() === '1') res.redirect(`${url}?admin=1&pass=${escape(config.config.adminPassword)}`);
                    else res.redirect(url);
                    return;
                }
            }

            if (files.length > 0) {
                let dimensionsFile: string = '';

                (files as StockFile[]).forEach((file, index) => {
                    if (dimensions) if (dimensions.includes(file.filename)) return;

                    let filePath: string = `${fullPath}/${file.filename}`;

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
                                    if (index == files.length - 1) fs.writeFileSync(`${fullPath}/dimensions.txt`, dimensionsFile, 'utf-8');
                                }
                            }
                        });
                    }
                });
            }

            res.render('stock', {
                meta: {
                    pageTitle: `${username}'s stock`,
                    title: `${username}'s stock - ${dirPath}`,
                    siteName: 'Stock',
                    author: username,
                    url: url,
                    image: user.avatar_url,
                    oEmbed: `${getURL()}/oembed?url=${escape(url)}`
                },
                stylesheet: `/views/stock.css`,
                favicon: `/views/favicon.ico`,
                directoryIcon: `/views/directory.png`,
                files: files,
                filesPerPage: config.config.filesPerPage,
                page: (req.query.page) ? parseInt(req.query.page.toString()) : 1,
                adminPassword: (req.query.admin && req.query.admin.toString() === '1') ? config.config.adminPassword : null,
                secured: process.env.TLS_CERT && process.env.TLS_KEY,
                sameUser: false
            }, (err: Error, html: string) => {
                if (err) {
                    if (isInDevelopment()) console.log(err);
                    res.status(500).end();
                    return;
                }

                if (html) res.status(200).send(html);
            });
        } else {
            if (type && mediaType) {
                let filenameParts = dirPath!.split('/');
                let filename = filenameParts[filenameParts.length - 1];
                if (!filename) { res.status(404).end(); return; }

                ffmpeg(fullPath).ffprobe((err, data) => {
                    if (err) {
                        if (isInDevelopment()) console.log(err);
                        res.status(500).end();
                        return;
                    }

                    if (data.streams[0]) {
                        if (data.streams[0].width && data.streams[0].height) {
                            if (req.query.source && req.query.source.toString() === '1') {
                                if (req.query.signature && req.query.iv) {
                                    let decryptedSignature = decryptSignature(unescape(req.query.signature.toString()), Buffer.from(process.env.KEY!, 'hex'), unescape(req.query.iv.toString()));
                                    if (!decryptedSignature) { sendForbidden(res); return; }

                                    const signatureParts = decryptedSignature.split('|');
                                    if (signatureParts.length !== 2) { sendForbidden(res); return; }
                                    if (!signatureParts[0] || !signatureParts[1]) { sendForbidden(res); return; }

                                    if (isInteger(signatureParts[0]) && checkTimeDifference(signatureParts[0], config.config.server.signatureExpiry) && signatureParts[1] === path.parse(fullPath).base) {
                                        res.set('Content-Type', type!);
                                        res.status(200).sendFile(fullPath, (err) => {
                                            if (err) {
                                                if (isInDevelopment()) console.log(err);
                                                res.status(500).end();
                                            }
                                        });
                                    } else {
                                        sendForbidden(res);
                                        return;
                                    }
                                } else {
                                    sendForbidden(res);
                                    return;
                                }
                            } else {
                                const url = getURL('user', username, 'stock', dirPath);

                                if (req.query.signature || req.query.iv) {
                                    res.redirect(url);
                                    return;
                                }

                                const signature = generateSignature(`${Date.now()}|${path.parse(fullPath).base}`, Buffer.from(process.env.KEY!, 'hex'));
                                if (!signature) { res.status(500).end(); return; }

                                let dir: string[] | string = dirPath!.split('/');
                                dir.pop();
                                dir = dir.join('/');

                                res.render('media', {
                                    meta: {
                                        title: `${filename} (${data.streams[0].width}x${data.streams[0].height})`,
                                        filename: filename,
                                        mediaType: mediaType,
                                        contentType: type,
                                        width: data.streams[0].width,
                                        height: data.streams[0].height,
                                        url: url,
                                        stockURL: getURL('user', username, 'stock'),
                                        siteName: 'Stock',
                                        mediaURL: `${url}?source=1&signature=${escape(signature.signature)}&iv=${escape(signature.iv)}`,
                                        thumbnail: `${getURL(username, 'stock', dirPath)}?signature=${escape(signature.signature)}&iv=${escape(signature.iv)}`,
                                        oEmbed: `${getURL()}/oembed?url=${escape(url)}`,
                                    },
                                    stylesheet: '/views/media.css',
                                    favicon: '/views/favicon.ico',
                                    script: '/views/media.js',
                                    secured: process.env.TLS_CERT && process.env.TLS_KEY,
                                    sameUser: false
                                }, (err: Error, html: string) => {
                                    if (err) {
                                        if (isInDevelopment()) console.log(err);
                                        res.status(500).end();
                                        return;
                                    }

                                    if (html) res.status(200).send(html);
                                });
                            }
                        } else res.status(404).end();
                    } else res.status(404).end();
                });
            } else res.status(404).end();
        }
    } else res.redirect('/login');
});

export default router;