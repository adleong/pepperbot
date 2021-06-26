const chatters = new Map();

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;

async function add(apiClient, user) {
	u = await apiClient.helix.users.getUserByName(user);
	chatters.set(u.displayName, Date.now());
}

function prune() {
	for (const [user, ts] of chatters) {
		if (Date.now() - ts > 1 * MINUTES) {
			console.log(`Pruning ${user} from active chatters`)
			chatters.delete(user);
		} 
	}
}

function command(chatClient, channel) {
	prune();
	const users = Array.from(chatters.keys());
	users.push('sgt_pepper_bot');
	const i = Math.floor(Math.random() * users.length);
	chatClient.say(channel, `You know who's awesome? ${users[i]} is awesome.`);
	if (users[i] == "sgt_pepper_bot") {
		chatClient.say(channel, 'If I do say so myself');
	}
}

function dumpChatters(chatClient, channel) {
	prune();
	for (const [user, ts] of chatters) {
    	chatClient.say(channel, user + ' last spoke at ' + new Date(ts).toString());
    }
}


module.exports = { add, command, dumpChatters };