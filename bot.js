// Load libraries
const Eris = require("eris");
const MessageEmbed = require("davie-eris-embed");
const { QuickDB } = require("quick.db");

// Load database
const db = new QuickDB({ filePath: "db.sqlite" });

// Load config file
const config = require("./config.json");
const icon = config.icon;
const pets = config.pets;
const eggs = config.eggs;

/*

	Made by WillyV

*/

// Leaderboard
let board = [];
async function lb() {
	
	// Clear the board
	board = [];
	
	// Get users
	let database = await db.get('users');
	for (user in database){
		if (user != 1109635837588680764) board.push([database[user].gold, database[user].name])
	}
	// Sort users by money
	board.sort(function(a, b){return b[0] - a[0]});

	// Schedule a new call in 60 seconds
    setTimeout(lb, 60000);
}

// Start leaderboard loop
lb();

// Initialize bot
const bot = new Eris.CommandClient("Bot " + require("./token.json").token, {
	intents: [
		"guilds",
		"guildMessages"
	]
}, {
	defaultHelpCommand: false,
    prefix: "."
});

// Run when bot is ready
bot.on("ready", async () => {
    console.log('\x1b[31m%s\x1b[0m', "Pet Simulator is now online.");
		bot.editStatus('idle',{
		type: 0,
		name: `Pet Simulator | .help`
	});
});

// Log errors instead of crashing
bot.on("error", (err) => {
    console.error(err);
});

// On message sent
bot.on("messageCreate", async (msg) => {
	
	// Check if sender is a bot
	if(msg.author.bot !== false) return;
	
	// Check if the user has any data
	if (!await db.get(`users.${msg.author.id}`)) {
		
		// Initialize player data
		await db.set(`users.${msg.author.id}`, {
			inv: {},
			pets: {},
			gold: 0,
			gems: 0,
			level: 1,
			exp: 0,
			skills: {},
			chatCooldown: 0
		});
	};
	// Get user's pets 
	let userPets = await db.get(`users.${msg.author.id}.pets`);
	
	// Calculate user's power
	let userPower = 1;
	for (pet in userPets) {
		userPower += pets[pet].power * userPets[pet];
	}
	
	// Update username in database (used for leaderboard)
	if (await db.get(`users.${msg.author.id}.name`) !== `${msg.author.username}`){
		await db.set(`users.${msg.author.id}.name`, `${msg.author.username}`)
	}
	
	// Update chat cooldown
	if (Date.now() - await db.get(`users.${msg.author.id}.chatCooldown`) > 59999) {
		await db.add(`users.${msg.author.id}.gold`, Math.floor(Math.random() * 10) * userPower);
		await db.set(`users.${msg.author.id}.chatCooldown`, Date.now());
	}
});

// Ping command
bot.registerCommand("ping", (msg) => {
	
	// Send message
	msg.channel.createMessage(
		new MessageEmbed()
		.setColor('#a0ff9c')
		.setAuthor(`${msg.author.username}`)
		.setThumbnail(`https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`)
		.setDescription('Pong!')
		.setFooter("What else were you expecting?").create
	).catch(err => console.error(err));
}, {
    description: "Ping, pong... you know the drill by now.",
	caseInsensitive: true,
	usage: ""
});

// Eggs command
bot.registerCommand("eggs", async (msg) => {
	
	// Create eggList and get user's level
	let eggList = '\n\n'
	let level = await db.get(`users.${msg.author.id}.level`);
	
	// Loop through egg array and add to eggList
	for (let i = 0; i < eggs.length; i++) {
		if (!eggs[i]) {
			break;
		}
		let egg = eggs[i];
		let eggName = egg.name.toLowerCase() + "egg"
		eggList += `${egg.icon} ${egg.name} Egg - ${icon.gold} ${egg.price}\n`
	}
	
	// Send message
	msg.channel.createMessage(
		new MessageEmbed()
		.setColor('#a0ff9c')
		.setAuthor(`Eggs`)
		.setDescription(eggList)
		.setFooter("Do .eggInfo <egg> to see possible pets.").create
	).catch(err => console.error(err));
}, {
    description: "View eggs.",
	caseInsensitive: true,
	usage: ""
});

// Egg info command
bot.registerCommand("eggInfo", async (msg, args) => {
	
	// Get user's level
	let level = await db.get(`users.${msg.author.id}.level`);
	
	// Check for arguments
	if (!args[0]) {
		msg.channel.createMessage(
			new MessageEmbed()
			.setColor('#d22b2b')
			.setAuthor(`Incorrect Usage`)
			.setDescription("Please specify an egg to view.").create
		).catch(err => console.error(err));
		return;
	}
	
	// Format input 
	let egg = args[0].charAt(0).toUpperCase() + args[0].toLowerCase().slice(1);
	
	// Get egg from eggs array
	for(let i = 0; i < eggs.length; i++) {
		if (eggs[i].name === egg) {
			egg = eggs[i];
			break;
		} 
	}
	
	// Check if egg exists
	if (!egg.level) {
		msg.channel.createMessage(
			new MessageEmbed()
			.setColor('#d22b2b')
			.setAuthor(`Error`)
			.setDescription("Couldn't find egg. Did you type it correctly?").create
		).catch(err => console.error(err));
		return;
	}
	
	// Check if user's level is high enough
	if (egg.level > level) {
		msg.channel.createMessage(
			new MessageEmbed()
			.setColor('#d22b2b')
			.setAuthor(`Error`)
			.setDescription("Your level is not high enough for this egg.").create
		).catch(err => console.error(err));
		return;
	}
	
	// Add spacing
	let format = '\n\n';
	
	// Initialize variables
	let eggPets = [];
	let totalWeight = 0;
	
	// Add each pet's data to the array and add their weights to totalWeight
	for (pet in egg.pets) {
		eggPets.push([egg.pets[pet].weight, pets[pet].icon, pets[pet].power]);
		totalWeight += egg.pets[pet].weight;
	}
	
	// Sort pets by power
	eggPets.sort(function(a, b) {
		return b[2] - a[2];
	});
	
	// Calculate chance for each pet and add to format string
	for (let i = 0; i < eggPets.length; i++) {
		let chance = (eggPets[i][0] / totalWeight) * 100;
		format += `${eggPets[i][1]} - Power: ${eggPets[i][2]}, Chance: ${parseFloat(chance.toFixed(2))}%\n`
	}
	
	// Send message
	msg.channel.createMessage(
		new MessageEmbed()
		.setColor('#a0ff9c')
		.setAuthor(`${egg.name} Egg`)
		.setDescription(format).create
	).catch(err => console.error(err));
}, {
    description: "View egg information.",
	caseInsensitive: true,
	usage: ""
});

// Hatch command
bot.registerCommand("hatch", async (msg, args) => {
	
	// Check for arguments
	if (!args[0]) {
		msg.channel.createMessage(
			new MessageEmbed()
			.setColor('#d22b2b')
			.setAuthor(`Incorrect Usage`)
			.setDescription("Please specify an egg to hatch.").create
		).catch(err => console.error(err));
		return;
	}
	
	// Format egg name
	let egg = args[0].charAt(0).toUpperCase() + args[0].toLowerCase().slice(1);
	for(let i = 0; i < eggs.length; i++) {
		if (eggs[i].name === egg) {
			egg = eggs[i];
			break;
		} 
	}
	
	// Check if egg exists
	if (!egg.level) {
		msg.channel.createMessage(
			new MessageEmbed()
			.setColor('#d22b2b')
			.setAuthor(`Error`)
			.setDescription("Couldn't find egg. Did you type it correctly?").create
		).catch(err => console.error(err));
		return;
	}
	
	// Get user's level
	const level = await db.get(`users.${msg.author.id}.level`);
	
	// Check if user's level is high enough
	if (egg.level > level) {
		msg.channel.createMessage(
			new MessageEmbed()
			.setColor('#d22b2b')
			.setAuthor(`Error`)
			.setDescription("Your level is not high enough for this egg.").create
		).catch(err => console.error(err));
		return;
	}
	
	// Get user's balance
	let balance = await db.get(`users.${msg.author.id}.gold`);
	
	// Check if user can afford egg
	if (egg.price > balance) {
		msg.channel.createMessage(
			new MessageEmbed()
			.setColor('#d22b2b')
			.setAuthor(`Error`)
			.setDescription(`You need ${icon.gold} ${egg.price - balance} more to buy this egg.\nEgg Price: ${icon.gold} ${egg.price}\nYour Balance: ${icon.gold} ${balance}`).create
		).catch(err => console.error(err));
		return;
	}
	
	// Get data for pets in egg
	let eggPets = [];
	let totalWeight = 0;
	for (pet in egg.pets) {
		eggPets.push([egg.pets[pet].weight, pets[pet].icon, pets[pet].power, pet]);
		totalWeight += egg.pets[pet].weight;
	}
	
	// Get numbers for RNG (between 0 and 1)
	let nums = [];
	for (let i = 0; i < eggPets.length; i++) {
		nums.push(eggPets[i][0] / totalWeight);
		if (i > 0) {
			nums[i] += nums[i-1];
		}
	}
	
	// Get a random (weighted) pet from egg
	let hatchedPet = [];
	const rand = Math.random();
	for (let i = 0; i < eggPets.length; i++) {
		let lastNum = nums[i-1] || 0;
		if (rand > lastNum && rand < nums[i]) {
			hatchedPet = eggPets[i];
			break;
		}
	}
	
	// Remove egg cost from balance and give the user the pet
	await db.sub(`users.${msg.author.id}.gold`, egg.price);
	await db.add(`users.${msg.author.id}.pets.${hatchedPet[3]}`, 1);
	
	// Calculate the chance to hatch the pet and get the amount of this pet the user has
	let chance = (hatchedPet[0] / totalWeight) * 100;
	let petCount = await db.get(`users.${msg.author.id}.pets.${hatchedPet[3]}`);
	
	// Send message
	msg.channel.createMessage(
		new MessageEmbed()
		.setColor('#a0ff9c')
		.setAuthor(`${egg.name} Egg`)
		.setDescription(`You hatched a ${hatchedPet[1]} ${hatchedPet[3]}!\nPower: ${hatchedPet[2]}\nRarity: ${pets[hatchedPet[3]].rarity} (${parseFloat(chance.toFixed(2))}%)\nYou now have ${petCount} ${hatchedPet[1]} ${hatchedPet[3]}(s)!\n`).create
	).catch(err => console.error(err));
}, {
    description: "Hatch an egg.",
	caseInsensitive: true,
	usage: "<egg>"
});

// Leaderboard command
bot.registerCommand("leaderboard", async (msg) => {
	
	// Initialize display string and rank
	let format = '\n\n';
	let rank = 0;
	
	// Get user's rnak
	for (let i = 0; i < board.length; i++){
		if (board[i][1] === `${msg.author.username}`){
			rank = i + 1;
			i = board.length;
			break;
		}
	}
	// Get top 10 users
	let newBoard = board.slice(9);
	
	// Format the board
	for (let i = 0; i < board.length; i++){
		format += `#${i + 1}. **${board[i][1]}** - ${icon.gold} ${board[i][0]}\n`
	}
	
	// Send message
	msg.channel.createMessage(
		new MessageEmbed()
		.setColor('#a0ff9c')
		.setAuthor(`🏆 Leaderboard 🏆`)
		.setDescription(format)
		.setFooter(`Your rank is #${rank}. Leaderboard updates once per minute.`).create
	).catch(err => console.error(err));
}, {
    description: "Display the richest of the rich.",
	caseInsensitive: true,
	usage: ""
});
bot.registerCommandAlias("lb", "leaderboard");

// Profile command
bot.registerCommand("profile", async (msg, args) => {
	
	// Check for mention
	if (msg.mentions[0]) {
		if (`<@${msg.mentions[0].id}>` == args[0]){
			
			// Get user data to display
			const lvl = await db.get(`users.${msg.mentions[0].id}.level`) || 1;
			const exp = await db.get(`users.${msg.mentions[0].id}.exp`) || 0;
			const gold = await db.get(`users.${msg.mentions[0].id}.gold`) || 0;
			const gems = await db.get(`users.${msg.mentions[0].id}.gems`) || 0;
			
			// Get user's pets 
			let userPets = await db.get(`users.${msg.mentions[0].id}.pets`);
	
			// Calculate user's power
			let userPower = 1;
			for (pet in userPets) {
				userPower += pets[pet].power * userPets[pet];
			}
			
			// Send message
			return msg.channel.createMessage(
				new MessageEmbed()
				.setColor('#a0ff9c')
				.setAuthor(`${msg.mentions[0].username}'s profile`)
				.setThumbnail(`https://cdn.discordapp.com/avatars/${msg.mentions[0].id}/${msg.mentions[0].avatar}.png`)
				.setDescription(`${icon.gem} ${gems}\n${icon.gold} ${gold}\n\n*${userPower} Total Power*`).create
			).catch(err => console.error(err));
		}
	}
	
	// Get user data to display
	const lvl = await db.get(`users.${msg.author.id}.level`) || 1;
	const exp = await db.get(`users.${msg.author.id}.exp`) || 0;
	const gold = await db.get(`users.${msg.author.id}.gold`) || 0;
	const gems = await db.get(`users.${msg.author.id}.gems`) || 0;
	
	// Get user's pets 
	let userPets = await db.get(`users.${msg.author.id}.pets`);
	
	// Calculate user's power
	let userPower = 1;
	for (pet in userPets) {
		userPower += pets[pet].power * userPets[pet];
	}
	
	// Send message
	msg.channel.createMessage(
		new MessageEmbed()
		.setColor('#a0ff9c')
		.setAuthor(`${msg.author.username}'s profile`)
		.setThumbnail(`https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`)
		.setDescription(`${icon.gem} ${gems}\n${icon.gold} ${gold}\n\n*${userPower} Total Power*`).create
	).catch(err => console.error(err));
}, {
    description: "View your profile, or someone else's.",
	caseInsensitive: true,
    usage: "[@mention]"
});

// Help commend
bot.registerCommand("help", (msg, args) => {
	
	// Initialize variables
	let format = '';
	let cmds = [];
	
	// Check for arguments
	if (!args[0]){
		
		// Add each command to array
		for (command in bot.commands){
			if (command)
			cmds.push(`\n**.${command}** - *${bot.commands[command].description}*`);
		}
		
		// Send message
		return msg.channel.createMessage(
			new MessageEmbed()
			.setColor('#a0ff9c')
			.setAuthor(`🗣️ Commands`)
			.setDescription(cmds.sort().join(''))
			.setFooter("Type '.help [command]' for usage.").create
		).catch(err => console.error(err));
	}
	
	// Look for inputted command in command list
	for (command in bot.commands){
		if (args[0].toLowerCase() === command.toLowerCase()){
			format = `*${bot.commands[command].description}*\n Usage: .${command} ${bot.commands[command].usage}`;
			break;
		}
	}
	
	// Check if string is empty
	if (format == ''){
		return msg.channel.createMessage(
			new MessageEmbed()
			.setColor('#ff0000')
			.setAuthor(`Hmmm...`)
			.setDescription(`${args[0].toLowerCase()} doesn't seem to be an actual command.`)
			.setFooter("Type '.help [command]' for usage.").create
		).catch(err => console.error(err));
	}
	
	// Send message
	return msg.channel.createMessage(
			new MessageEmbed()
			.setColor('#a0ff9c')
			.setAuthor(`-${args[0].toLowerCase()}`)
			.setDescription(format)
			.setFooter("Type .help for more commands.").create
		).catch(err => console.error(err));
	
}, {
    description: "Open the help menu.",
	caseInsensitive: true,
	usage: "[command]"
});
bot.registerCommandAlias("?", "help");

// Inventory command
bot.registerCommand("inventory", async (msg, args) => {
	
	// Check for mention
	if (msg.mentions[0]) {
		if (`<@${msg.mentions[0].id}>` == args[0]){
			
			// Initialize variables
			let itemFormat = '**Items:**';
			let petFormat = '**Pets:**';
			let petArray = [];
			
			// Get user's inventory and pets
			let inv = await db.get(`users.${msg.mentions[0].id}.inv`);
			let petinv = await db.get(`users.${msg.mentions[0].id}.pets`);
			
			// Format user's inventory
			for (item in inv){
				itemFormat += `\n**${item}** ${icon[item]}: *${inv[item]}*`;
			}
			
			// Format user's pet inventory
			for (pet in petinv){
				petArray.push({name: pet, power: pets[pet].power})
			}
			petArray.sort((a, b) => b.name - a.name);
			petArray.sort((a, b) => b.power - a.power);
			
			// Format pets string
			for (let i = 0; i < petArray.length; i++){
				petFormat += `\n${pets[petArray[i].name].icon} **${petArray[i].name}**: *${pets[petArray[i].name].power} Power* (x${petinv[petArray[i].name]})`;
			}
			
			// Send message
			return msg.channel.createMessage(
				new MessageEmbed()
				.setColor('#a0ff9c')
				.setAuthor(`${msg.mentions[0].username}'s inventory`)
				.setDescription(`${itemFormat}\n\n${petFormat}`).create
			).catch(err => console.error(err));
		}
	}
	
	// Initialize variables
	let itemFormat = '**Items:**';
	let petFormat = '**Pets:**';
	let petArray = [];
	
	// Get user's inventory and pets
	let inv = await db.get(`users.${msg.author.id}.inv`);
	let petinv = await db.get(`users.${msg.author.id}.pets`);
	
	// Format user's inventory
	for (item in inv){
		itemFormat += `\n**${item}** ${icon[item]}: *${inv[item]}*`;
	}
	
	// Format user's pet inventory
	for (pet in petinv){
		petArray.push({name: pet, power: pets[pet].power})
	}
	petArray.sort((a, b) => b.name - a.name);
	petArray.sort((a, b) => b.power - a.power);
	
	// Format pets string
	for (let i = 0; i < petArray.length; i++){
		petFormat += `\n${pets[petArray[i].name].icon} **${petArray[i].name}**: *${pets[petArray[i].name].power} Power* (x${petinv[petArray[i].name]})`;
	}
	
	// Send message
	msg.channel.createMessage(
		new MessageEmbed()
		.setColor('#a0ff9c')
		.setAuthor(`${msg.author.username}'s inventory`)
		.setDescription(`${itemFormat}\n\n${petFormat}`).create
	).catch(err => console.error(err));
}, {
    description: "Open your inventory.",
	caseInsensitive: true,
	usage: "[@mention]"
});
bot.registerCommandAlias("inv", "inventory");

// Start bot
bot.connect();