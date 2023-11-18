const pronouns = require("./pronouns.js");

const chatters = new Map();

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;

async function add(apiClient, channel, user) {
    const u = await apiClient.users.getUserByName(user);
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

async function third_person(user) {
    return pronouns.get_pronoun_id(user).then(id => {
        switch (id) {
            case "aeaer": return "aer";
            case "any": return ["him", "her", "them"][Math.floor(Math.random() * 3)];
            case "eem": return "em";
            case "faefaer": return "faer";
            case "hehim": return "him";
            case "heshe": return ["him", "her"][Math.floor(Math.random() * 2)];
            case "hethem": return ["him", "them"][Math.floor(Math.random() * 2)];
            case "itits": return "it";
            case "other": return "this one";
            case "perper": return "per";
            case "sheher": return "her";
            case "shethem": return ["her", "them"][Math.floor(Math.random() * 2)];
            case "theythem": return "them";
            case "vever": return "ver";
            case "xexem": return "xem";
            case "ziehir": return "hir";
            default: return "them";
        }
    }).catch(() => "them");
}

function get(channel, self) {
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
    return users[i];
}

async function command(chatClient, channel, self, db) {
    let user = get(channel, self);
    if (user) {
        const them = await third_person(user);
        chatClient.say(channel, `You know who's awesome? ${user} is awesome! We love ${them}.`);

        const { rows } = await db.query('SELECT message FROM catchphrases WHERE user_name = $1', [user]);
        if (rows.length > 0) {
            chatClient.say(channel, rows[0].message);
        }
    }
}

async function setCatchphrase(chatClient, apiClient, channel, db, user, catchphrase) {
    const u = await apiClient.users.getUserByName(user);
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

module.exports = {
    add,
    get,
    command,
    dumpChatters,
    setCatchphrase
};
