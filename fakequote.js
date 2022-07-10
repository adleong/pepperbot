const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const re = /\-\w\w+\W*$/;
const url = /(\w+:\/\/)?\w+\.[a-zA-Z0-9\/\?\%\#\&_=\-\.]+/g;

async function command(chatClient, channel) {
    const quote = await fake();
    if (quote) {
        chatClient.say(channel, quote);
    } else {
        chatClient.say(channel, "Sorry, I couldn't think of anything. -Sgt Pepper Bot");
    }
}

async function fake() {
    let quote = await create();
    // Replace all links in quote with [hyperlink blocked]
    quote = quote.replaceAll(url, "[hyperlink blocked]");

    const response = await openai.createCompletion("content-filter-alpha", {
        prompt: "<|endoftext|>" + quote + "\n--\nLabel:",
        temperature: 0,
        max_tokens: 1,
        top_p: 0,
        logprobs: 10
    })
    const classification = response.data.choices[0];
    if (classification.text == "0" || classification.text == "1") {
        return quote;
    }
    if (classification.logprobs.top_logprobs[0][classification.text] < -0.355) {
        return quote;
    }
    console.log("Rejecting unsafe quote: " + quote);
    console.log(classification.text);
    console.log(classification.logprobs.top_logprobs[0]);
    return await fake();
}

async function create() {
    const response = await openai.createCompletionFromModel({
        model: "curie:ft-personal-2022-07-10-22-06-17",
        prompt: "",
        stop: "###",
        n: 10,
        max_tokens: 250,
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