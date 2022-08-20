const axios = require('axios');

let display = null;

async function pronouns(chatClient, channel, user) {
    return get_pronouns(user).then(pronoun => {
        if (pronoun) {
            chatClient.say(channel, `I think ${user}'s pronouns are ${pronoun}. If this isn't right, set them at https://pronouns.alejo.io`);
        } else {
            chatClient.say(channel, `I don't know ${user}'s pronouns. Set them at https://pronouns.alejo.io`);
        }
    }).catch(() => chatClient.say(channel, `I don't know ${user}'s pronouns. Set them at https://pronouns.alejo.io`));
}

async function get_pronouns(user) {
    if (!display) {
        display = {};
        const res = await axios.get(`https://pronouns.alejo.io/api/pronouns`);
        const pronouns = res.data;
        for (const pronoun of pronouns) {
            display[pronoun.name] = pronoun.display;
        }
    }
    const res = await axios.get(`https://pronouns.alejo.io/api/users/${user}`);
    if (!res.data[0]) {
        return null;
    }
    const id = res.data[0].pronoun_id;
    return display[id];
}

module.exports = { pronouns, get_pronouns };