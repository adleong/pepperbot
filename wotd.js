const got = require('got');

async function command(chatClient, channel) {
    chatClient.say(channel, "generating word...");
    const response = await got("https://randomwordgenerator.com/json/fake-words.json", { json: true });
    const words = response.body.data;
    const i = Math.floor(Math.random() * words.length);
    const word = words[i].word;
    chatClient.say(channel, `What does "${word}" mean? (wrong answers only)`);
}

module.exports = {
    command
};