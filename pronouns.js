const axios = require('axios');



async function pronouns(chatClient, channel, user) {
    const display = {};
    const res = await axios.get(`https://pronouns.alejo.io/api/pronouns`);
    const pronouns = res.data;
    for (const pronoun of pronouns) {
        display[pronoun.name] = pronoun.display;
    }
    return axios.get(`https://pronouns.alejo.io/api/users/${user}`).then(res => {
        const id = res.data[0].pronoun_id;
        const pronoun = display[id];
        if (id) {
            chatClient.say(channel, `I think ${user}'s pronouns are ${pronoun}. If this isn't right, set them at https://pronouns.alejo.io`);
        } else {
            chatClient.say(channel, `I don't know ${user}'s pronouns. Set them at https://pronouns.alejo.io`);
        }
    }).catch(() => chatClient.say(channel, `I don't know ${user}'s pronouns. Set them at https://pronouns.alejo.io`));
}

module.exports = { pronouns };