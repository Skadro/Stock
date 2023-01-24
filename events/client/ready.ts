import { Client, Guild, GuildBasedChannel } from 'discord.js';

import { config } from "../../utils/Storage";
import { addCategory, changeDir, changeDomain, changePort, changeServer, createToday, formatDate, isEmbedTitle, submitFiles } from "../../utils/Functions";

import readline from 'readline';
const rl: readline.Interface = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

/**
 * @event
 * @param {Client} client The bot's client
 * @returns {Promise<void>}
 */
export default async function (client: Client): Promise<void> {
	if (!client.isReady()) return;

	console.log(`Logged in as ${client.user.tag} (ID: ${client.user.id})`);
	async function commandPrompt() {
		let question: void = rl.question('Command: ', async (command) => {
			let args = command.slice(0).split(/ +/);
			let cmd = args.shift();

			if (cmd) {
				cmd = cmd.toLowerCase();
				switch (cmd) {
					case 'reloadconfig':
					case 'reloadcfg':
						config.reload();
						break;
					case 'stop':
					case 'shutdown':
						client.destroy();
						process.exit(0);
						break;
					case 'createtoday':
						await createToday(formatDate(new Date(Date.now()))).then((i) => {
							console.log(`Created today\'s folders for ${i} category(-ies)`);
							config.reload();
						}).catch((err) => {
							console.log(err);
						});

						break;
					case 'submit':
						await submitFiles(formatDate(new Date(Date.now())), client).then((i) => {
							console.log(`Submitted ${i} file(s)`);
						}).catch((err) => {
							console.log(err);
						});

						break;
					case 'addcategory':
						if (!args[0]) { console.log('You must provide the category name'); break; }
						if (!args[1]) { console.log('You must provide the category channel ID'); break; }
						if (!args[2]) { console.log('You must provide the category embed title'); break; }
						if (!isEmbedTitle(args[2])) { console.log('The embed title is invalid'); break; }

						addCategory(client, args[0], args[1], args[2]);

						break;
					case 'changeserver':
						if (!args[0]) { console.log('You must provide the server ID'); break; }

						changeServer(client, args[0]);

						break;
					case 'changedomain':
						if (!args[0]) { console.log('You must provide the domain'); break; }

						changeDomain(args[0]);

						break;
					case 'changedir':
						if (!args[0]) { console.log('You must provide the directory name'); break; }

						changeDir(args[0]);

						break;
					case 'changeport':
						if (!args[0]) { console.log('You must provide the port'); break; }
						if (isNaN(Number(args[0])) || !Number.isSafeInteger(Number(args[0]))) { console.log('The port is invalid'); break; }

						changePort(parseInt(args[0]));

						break;
					default:
						commandPrompt();
				}
			}
			commandPrompt();
		});
	}

	commandPrompt();
}