const chatters = new Map();

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;

async function add(apiClient, channel, user) {
    const u = await apiClient.helix.users.getUserByName(user);
    if (chatters.has(channel)) {
        chatters.get(channel).set(u.displayName, Date.now());
    } else {
        chatters.set(channel, new Map([[u.displayName, Date.now()]]));
    }
}

function prune() {
    for (const [channel, users] of chatters) {
        for (const [user, ts] of users) {
            if (Date.now() - ts > 30 * MINUTES) {
                console.log(`Pruning ${user} from active chatters in ${channel}`)
                users.delete(user);
            }
        }
    }
}

function sleep(ms) {
    // add ms millisecond timeout before promise resolution
    return new Promise(resolve => setTimeout(resolve, ms))
  }

async function command(chatClient, channel, self, db) {
    prune();
    let users = [];
    if (chatters.has(channel)) {
        users = Array.from(chatters.get(channel).keys());
    }
    if (users.length === 0) {
        return;
    }
    users.push(self);
    const i = Math.floor(Math.random() * users.length);
    chatClient.say(channel, `You know who sucks? ${users[i]} is the WORST!`);
    await sleep(10000);
    chatClient.say(channel, `April Fools! ${users[i]} is actually awesome!`);

    const { rows } = await db.query('SELECT message FROM catchphrases WHERE user_name = $1', [users[i]]);
    if (rows.length > 0) {
        chatClient.say(channel, rows[0].message);
    }
}

async function setCatchphrase(chatClient, apiClient, channel, db, user, catchphrase) {
    const u = await apiClient.helix.users.getUserByName(user);
    const { rows } = await db.query('SELECT * FROM catchphrases WHERE user_name = $1', [u.displayName]);
    if (rows.length === 0) {
        await db.query('INSERT INTO catchphrases (user_name, message) VALUES ($1, $2)', [u.displayName, catchphrase]);
    } else {
        await db.query('UPDATE catchphrases SET message = $1 WHERE user_name = $2', [catchphrase, u.displayName]);
    }
    chatClient.say(channel, 'Catchphrase for ' + u.displayName + ' set to: ' + catchphrase);
}


function dumpChatters(chatClient, channel) {
    prune();
    for (const [user, ts] of chatters.get(channel)) {
        chatClient.say(channel, user + ' last spoke at ' + new Date(ts).toString());
    }
}

function get(channel){
    prune();
    let users = [];
    if (chatters.has(channel)) {
        users = Array.from(chatters.get(channel).keys());
    }
    if (users.length === 0) {
        return "sgt_pepper_bot";
    }
    const i = Math.floor(Math.random() * users.length);
    return users[i];
}

module.exports = {
    add,
    command,
    dumpChatters,
    setCatchphrase,
    get
};