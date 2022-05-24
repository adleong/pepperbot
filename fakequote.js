const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const re = /\-\w\w+\W*$/;

async function command(chatClient, channel) {
    const quote = await fake();
    if (quote) {
        chatClient.say(channel, quote);
    } else {
        chatClient.say(channel, "Sorry, I couldn't think of anything. -Sgt Pepper Bot");
    }
}

async function fake() {
    const response = await openai.createCompletionFromModel({
        model: "curie:ft-personal-2022-04-29-00-17-58",
        prompt: "",
        stop: "###",
        n: 10,
      });
    for (const choice of response.data.choices) {
        if (choice.text.match(re)) {
            return choice.text;
        }
    }
    return null;
}

module.exports = {
    command,
    fake,
};