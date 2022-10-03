const axios = require('axios');

const display = {
    "aeaer": "Ae/Aer",
    "any": "Any",
    "eem": "E/Em",
    "faefaer": "Fae/Faer",
    "hehim": "He/Him",
    "heshe": "He/She",
    "hethem": "He/They",
    "itits": "It/Its",
    "other": "Other",
    "perper": "Per/Per",
    "sheher": "She/Her",
    "shethem": "She/They",
    "theythem": "They/Them",
    "vever": "Ve/Ver",
    "xexem": "Xe/Xem",
    "ziehir": "Zie/Hir",
};
let cache = {};

const client = axios.create({
    baseURL: 'https://pronouns.alejo.io/api',
    timeout: 5000,
  });

async function pronouns(chatClient, channel, user) {
    return get_pronouns(user).then(pronoun => {
        if (pronoun) {
            chatClient.say(channel, `I think ${user}'s pronouns are ${pronoun}. If this isn't right, set them at https://pronouns.alejo.io`);
        } else {
            chatClient.say(channel, `I don't know ${user}'s pronouns. Set them at https://pronouns.alejo.io`);
        }
    }).catch(() => chatClient.say(channel, `Sorry, I'm having trouble getting ${user}'s pronouns. Try again later.`));
}

async function get_pronoun_id(user) {
    if (cache[user]) {
        return cache[user];
    }
    const res = await client.get(`/users/${user}`);
    if (res == null || !res.data[0]) {
        return null;
    }
    const id = res.data[0].pronoun_id;
    cache[user] = id;
    return out;
}

async function get_pronouns(user) {
    const id = await get_pronoun_id(user);
    if (!id) {
        return null;
    }
    const out = display[id];
    if (!out) {
        console.log("Unknown pronoun id: " + id + " for user " + user);
        return null;
    }
    return out;
}

module.exports = { pronouns, get_pronouns, get_pronoun_id };
