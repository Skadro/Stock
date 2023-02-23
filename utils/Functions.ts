import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { Client, EmbedBuilder, GuildBasedChannel, Guild, Snowflake, TextBasedChannel, TextChannel } from 'discord.js';
import ffmpeg from 'fluent-ffmpeg';
import { Express } from 'express';
import cors from 'cors';

import { EmbedTitle, FilesEmbeds, FormattedDate } from './Structures';
import { config } from './Storage';
import mime from 'mime';

/**
 * @function
 * @param date Formatted date
 * @returns {Promise<string>} A promise resolving the number of created folders
 */
export async function createToday(date: FormattedDate): Promise<string> {
    let i = 0;
    return await new Promise((resolve, reject) => {
        try {
            const rootDir = `./${config.config.express.rootDir}`;
            const datePath = `${date.year}/${date.month}/${date.day}`;

            config.config.categories.forEach((category) => {
                if (category.name.trim() == null || category.name.trim() == '') return;
                if (/[\\/:*?"<>|]/ig.test(category.name)) return;

                const fullPath = path.resolve(`${rootDir}/${category.name}/${datePath}`);

                if (!fs.existsSync(fullPath)) {
                    i++;
                    fs.mkdirSync(fullPath, { recursive: true });
                }
            });
        } catch (err) {
            reject(err);
        }
        resolve(i.toString());
    });
}

/**
 * 
 * @param date A Date instance
 * @returns {FormattedDate} Formatted date
 */
export function formatDate(date: Date): FormattedDate {
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();

    let finalDate: FormattedDate = { year: '', month: '', day: '' } as FormattedDate;

    finalDate.year = date.getUTCFullYear().toString();

    if (month.toString().length < 2) {
        finalDate.month = "0" + month.toString();
    } else {
        finalDate.month = month.toString();
    }

    if (day.toString().length < 2) {
        finalDate.day = "0" + day.toString();
    } else {
        finalDate.day = day.toString();
    }

    return finalDate;
}

/**
 * @param fileName The file name
 * @param savePath The folder where to save the thumbnail (and the video is located)
 * @returns {void}
 */
export function generateThumbnail(fileName: string, savePath: string): void {
    ffmpeg(`${savePath}/${fileName}`)
        .on('error', (err) => {
            if (err) console.log(err);
        }).takeScreenshots({
            count: 1,
            timemarks: ['0'],
            filename: `${path.parse(fileName).name}_thumb.png`
        }, `${savePath}/thumbs`);
}

/**
 * @param client The bot's client
 * @param app The Express app
 * @returns {void}
 */
export function serverSetup(client: Client, app: Express): void {
    try {
        app.use(cors({
            origin: '*'
        }));

        app.all('/', (_req, res) => {
            res.status(404).end();
        });

        app.all(`/${config.config.express.rootDir}`, (_req, res) => {
            res.status(404).end();
        });

        app.all(`/${config.config.express.rootDir}/:category`, async (req, res) => {
            req.on('error', (err) => {
                console.log(err);
                res.status(500).end();
            });

            res.on('error', (err) => {
                console.log(err);
                res.status(500).end();
            });

            try {
                if (!client.isReady()) { res.status(404).end(); return; }

                switch (req.params.category) {
                    case 'createtoday':
                        try {
                            await createToday(formatDate(new Date(Date.now()))).then((i) => {
                                if (parseInt(i) > 0) {
                                    res.status(200).send(`Created today\'s folders for ${i} category(-ies)`).end();
                                    config.reload();
                                } else {
                                    res.status(404).end();
                                }
                            }).catch((err) => {
                                console.log(err);
                                res.status(500).end();
                            });
                        } catch (err) {
                            console.log(err);
                            res.status(500).end();
                        }

                        break;
                    case 'submit':
                        try {
                            await submitFiles(formatDate(new Date(Date.now())), client).then((i) => {
                                if (parseInt(i) > 0) {
                                    res.status(200).send(`Submitted ${i} file(s)`).end();
                                } else {
                                    res.status(404).end();
                                }
                            }).catch((err) => {
                                console.log(err);
                                res.status(500).end();
                            });
                        } catch (err) {
                            console.log(err);
                            res.status(500).end();
                        }

                        break;
                    default:
                        res.status(404).end();
                        break;
                }
            } catch (err) {
                console.log(err);
                res.status(500).end();
            }
        });

        app.all(`/${config.config.express.rootDir}/:category/:year`, (_req, res) => {
            res.status(404).end();
        });

        app.all(`/${config.config.express.rootDir}/:category/:year/:month`, (_req, res) => {
            res.status(404).end();
        });

        app.all(`/${config.config.express.rootDir}/:category/:year/:month/:day`, (_req, res) => {
            res.status(404).end();
        });

        app.all(`/${config.config.express.rootDir}/:category/:year/:month/:day/:thumbs/:filename`, (req, res) => {
            req.on('error', (err) => {
                console.log(err);
                res.status(500).end();
            });

            res.on('error', (err) => {
                console.log(err);
                res.status(500).end();
            });

            try {
                if (!client.isReady()) { res.status(404).end(); return; }

                const fullPath = path.resolve(`./${config.config.express.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/thumbs/${req.params.filename}`);

                if (!fs.existsSync(fullPath)) { res.status(404).end(); return; }
                if (!/(.jpeg|.jpg|.gif|.bmp|.png|.webp)$/ig.test(req.params.filename)) { res.status(404).end(); return; }

                const type = mime.getType(path.parse(fullPath).ext);
                if (type) {
                    fs.readFile(fullPath, (err, data) => {
                        if (err) {
                            console.log(err);
                            res.status(500).end();
                            return;
                        }

                        res.writeHead(200, { 'Content-Type': type });
                        res.end(data);
                    })
                }
            } catch (err) {
                console.log(err);
                res.status(500).end();
            }
        });

        app.all(`/${config.config.express.rootDir}/:category/:year/:month/:day/:filename`, (req, res) => {
            req.on('error', (err) => {
                console.log(err);
                res.status(500).end();
            });

            res.on('error', (err) => {
                console.log(err);
                res.status(500).end();
            });

            try {
                if (!client.isReady()) { res.status(404).end(); return; }

                const fullPath = path.resolve(`./${config.config.express.rootDir}/${req.params.category}/${req.params.year}/${req.params.month}/${req.params.day}/${req.params.filename}`);

                if (!fs.existsSync(fullPath)) { res.status(404).end(); return; }
                if (!/(.jpeg|.jpg|.gif|.bmp|.png|.webp|.webm|.mkv|.flv|.ogg|.ogv|.avi|.mov|.wmv|.mp4|.m4p|.m4v)$/ig.test(req.params.filename)) { res.status(404).end(); return; }

                if (req.query.dl && req.query.dl == '1') {
                    res.download(fullPath, (err) => {
                        if (err) {
                            console.log(err);
                            res.status(500).end();
                        }
                    });
                } else {
                    const type = mime.getType(path.parse(fullPath).ext);
                    if (type) {
                        fs.readFile(fullPath, (err, data) => {
                            if (err) {
                                console.log(err);
                                res.status(500).end();
                                return;
                            }

                            res.writeHead(200, { 'Content-Type': type });
                            res.end(data);
                        })
                    }
                }
            } catch (err) {
                console.log(err);
                res.status(500).end();
            }
        });

        app.all(`/${config.config.express.rootDir}/:category/:year/:month/:day/:filename/*`, (_req, res) => {
            res.status(404).end();
        });

        const server = app.listen(config.config.express.port, () => {
            console.log(`Listening on port ${config.config.express.port}`);
        });

        server.timeout = config.config.express.serverTimeout;
    } catch (err) {
        console.log(err);
    }
}

/**
 * @param date Formatted date
 * @param client The bot's client
 * @returns {Promise<string>} A promise resolving the number of submitted files
 */
export async function submitFiles(date: FormattedDate, client: Client): Promise<string> {
    let i = 0;
    return new Promise(async (resolve, reject) => {
        try {
            const rootDir = `./${config.config.express.rootDir}`;
            const datePath = `${date.year}/${date.month}/${date.day}`;

            var ex = { message: '' };
            try {
                config.config.categories.forEach(async (category) => {
                    if (category.name.trim() == null || category.name.trim() == '') return;
                    if (/[\\/:*?"<>|]/g.test(category.name)) return;

                    const fullPath = path.resolve(`${rootDir}/${category.name}/${datePath}`);
                    if (!fs.existsSync(fullPath)) return;

                    let guild: Guild | undefined = client.guilds.cache.get(config.config.serverID);
                    let channel: GuildBasedChannel | undefined = undefined;

                    if (guild) {
                        channel = guild.channels.cache.get(category.channelID);
                        if (!channel || !channel.isTextBased()) {
                            ex.message = `The \"${category.name}\" does not exist`;
                            throw ex;
                        }
                    } else {
                        ex.message = `The guild does not exist (ID: ${config.config.serverID})`;
                        throw ex;
                    }

                    let files = fs.readdirSync(fullPath, { encoding: 'utf8' }).filter((file) => {
                        return fs.lstatSync(`${fullPath}/${file}`).isFile() &&
                            /(.jpeg|.jpg|.gif|.bmp|.png|.webp|.webm|.mkv|.flv|.ogg|.ogv|.avi|.mov|.wmv|.mp4|.m4p|.m4v)$/ig.test(file) &&
                            (fs.statSync(`${fullPath}/${file}`).size / Math.pow(10, 9)) < 2 &&
                            (!fs.existsSync(`${fullPath}/stocked`) || !fs.readFileSync(`${fullPath}/stocked`, { encoding: 'utf8' }).includes(file))
                    });

                    files.forEach((file) => {
                        if (/[:/?#\[\]@!$&'()*+,;="<>%{}|\\^`~]/g.test(file)) {
                            fs.renameSync(`${fullPath}/${file}`, `${fullPath}/${file.replace(/[:/?#\[\]@!$&'()*+,;="<>%{}|\\^`~]/g, '')}`)
                            files.splice(files.indexOf(file), 1, file.replace(/[:/?#\[\]@!$&'()*+,;="<>%{}|\\^`~]/g, ''));
                        }
                    });

                    if (files.length > 0) {
                        i += files.length;
                        files.sort((a, b) => {
                            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
                        });

                        let filesEmbeds: FilesEmbeds = { embeds: [], files: [] };
                        let filesOverflow: FilesEmbeds = { embeds: [], files: [] };

                        files.forEach((file) => {
                            let embed: EmbedBuilder = new EmbedBuilder();

                            if (/(.jpeg|.jpg|.gif|.bmp|.png|.webp)$/ig.test(file)) {
                                embed
                                    .setTitle(file)
                                    .setURL(new URL(`http://${config.config.express.domain}:${config.config.express.port}/${config.config.express.rootDir}/${category.name}/${datePath}/${file}`).href)
                                    .setImage(new URL(`http://${config.config.express.domain}:${config.config.express.port}/${config.config.express.rootDir}/${category.name}/${datePath}/${file}`).href);
                            } else if (/(.webm|.mkv|.flv|.ogg|.ogv|.avi|.mov|.wmv|.mp4|.m4p|.m4v)$/ig.test(file)) {
                                if (!fs.existsSync(`${fullPath}\\thumbs`)) fs.mkdirSync(`${fullPath}\\thumbs`);
                                generateThumbnail(file, fullPath);

                                embed
                                    .setTitle(file)
                                    .setURL(new URL(`http://${config.config.express.domain}:${config.config.express.port}/${config.config.express.rootDir}/${category.name}/${datePath}/${file}`).href)
                                    .setImage(new URL(`http://${config.config.express.domain}:${config.config.express.port}/${config.config.express.rootDir}/${category.name}/${datePath}/thumbs/${path.parse(file).name}_thumb.png`).href);
                            }

                            switch (category.embedTitle) {
                                case 'download':
                                    embed
                                        .setTitle('Download')
                                        .setURL(new URL(`http://${config.config.express.domain}:${config.config.express.port}/${config.config.express.rootDir}/${category.name}/${datePath}/${file}?dl=1`).href);
                                    break;
                                case 'filename':
                                    embed
                                        .setTitle(path.parse(file).name);
                                    break;
                                case 'fullfilename':
                                default:
                                    break;
                            }

                            filesEmbeds.embeds.push(embed);
                            filesEmbeds.files.push(file);
                        });

                        while (filesEmbeds.embeds.length > 0) {
                            if (filesEmbeds.embeds.length <= 10) {
                                await (channel as TextChannel).send({ embeds: filesEmbeds.embeds })
                                    .then(async () => {
                                        filesEmbeds.files.forEach(async (file) => {
                                            await fsPromises.appendFile(`${fullPath}/stocked`, `${file}\n`, 'utf8');
                                        });
                                        filesEmbeds.embeds = [];
                                        filesEmbeds.files = [];
                                    }).catch((err) => {
                                        reject(err);
                                    });
                                if (filesOverflow.embeds.length > 0) {
                                    filesEmbeds.embeds = filesOverflow.embeds;
                                    filesEmbeds.files = filesOverflow.files;
                                    filesOverflow.embeds = [];
                                    filesOverflow.files = [];
                                }
                            } else {
                                filesOverflow.embeds.push(filesEmbeds.embeds[filesEmbeds.embeds.length - 1]);
                                filesOverflow.files.push(filesEmbeds.files[filesEmbeds.files.length - 1]);
                                filesEmbeds.embeds.pop();
                                filesEmbeds.files.pop();
                            }
                        }
                    }
                });
            } catch (err) {
                reject(err);
            }
        } catch (err) {
            reject(err);
        }
        resolve(i.toString());
    });
}

/**
 * @function
 * @param client The bot's client
 * @param dir Event category folder
 * @returns {void}
 */
export function loadEvents(client: Client, dir: string): void {
    const event_files = fs.readdirSync(path.resolve(`./events/${dir}`)).filter((file) => fs.lstatSync(path.resolve(`./events/${dir}/${file}`)).isFile() && file.endsWith('.ts'));

    for (const file of event_files) {
        const event: Function | null | undefined = require(path.resolve(`./events/${dir}/${file}`)).default;
        if (!event) continue;

        const event_name = file.split('.')[0];
        client.on(event_name, event.bind(null, client));
    }
}

/**
 * @handler
 * @param {Client} client The bot's client
 * @returns {void}
 */
export function eventHandler(client: Client): void {
    const dirs = fs.readdirSync(path.resolve('./events')).filter((dir) => fs.lstatSync(path.resolve(`./events/${dir}`)).isDirectory() && fs.readdirSync(path.resolve(`./events/${dir}`)).length > 0);

    dirs.forEach((dir) => loadEvents(client, dir));
}

/**
 * @function
 * @param title The string
 * @returns {boolean} Whetever the string is `EmbedTitle`
 */
export function isEmbedTitle(title: string): title is EmbedTitle {
    return ['download', 'filename', 'fullfilename'].includes(title);
}

/**
 * @function
 * @param client The bot's client
 * @param name The category's name
 * @param channelID The category's channel's ID
 * @param embedTitle The category's embed title
 * @returns {void}
 */
export function addCategory(client: Client, name: string, channelID: Snowflake, embedTitle: EmbedTitle): void {
    let guild: Guild | undefined = client.guilds.cache.get(config.config.serverID);
    let channel: GuildBasedChannel | undefined = undefined;

    if (guild) {
        channel = guild.channels.cache.get(channelID);
        if (!channel || !channel.isTextBased()) {
            console.log(`The channel does not exist`);
            return;
        }
    } else {
        console.log(`The guild does not exist (ID: ${config.config.serverID})`);
        return;
    }

    config.config.categories.push({ name: name, channelID: channelID, embedTitle: embedTitle });
    config.rewrite();

    console.log(`Category \"${name}\" has been created. You need to use \"createtoday\" to create its folder`);
}

/**
 * @function
 * @param client The bot's client
 * @param serverID The server's ID
 * @returns {void}
 */
export function changeServer(client: Client, serverID: Snowflake): void {
    let guild: Guild | undefined = client.guilds.cache.get(serverID);
    if (!guild) { console.log('The guild does not exist'); return; }

    config.config.serverID = guild.id;
    config.rewrite();

    console.log('Server changed successfully');
}

/**
 * @function
 * @param domain The domain
 * @returns {void}
 */
export function changeDomain(domain: string): void {
    config.config.express.domain = domain;
    config.rewrite();

    console.log('Domain changed successfully');
}

/**
 * @function
 * @param dirName The directory name
 * @returns {void}
 */
export function changeDir(dirName: string): void {
    config.config.express.rootDir = dirName;
    config.rewrite();

    console.log('Directory changed successfully. You need to use \"createtoday\" to create the folder');
}

/**
 * @function
 * @param port The port
 * @returns {void}
 */
export function changePort(port: number): void {
    config.config.express.port = port;
    config.rewrite();

    console.log('Port changed successfully');
}

/**
 * @function
 * @param filename The filename
 * @returns {boolean}
 */
export function checkIfVideo(filename: string): boolean {
    if (/(.webm|.mkv|.flv|.ogg|.ogv|.avi|.mov|.wmv|.mp4|.m4p|.m4v)$/ig.test(filename)) return true;
    return false;
}