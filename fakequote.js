const { OpenAI } = require("openai");
const openai = new OpenAI(process.env.OPENAI_API_KEY);
const re = /\-\w\w+\W*$/;
const url = /(\w+:\/\/)?\w+\.[a-zA-Z0-9][a-zA-Z0-9\/\?\%\#\&_=\-\.]*/g;
const period = /\.\W*/g;

async function command(chatClient, channel) {
    const quote = await fake();
    // split quote into message of length at most 450
    for (m of quote.match(/.{1,450}/g)) {
        chatClient.say(channel, m);
    }
    return quote;
}

async function fake() {
    let quote = await create().catch(error => {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.log(error.response.data);
            console.log(error.response.status);
        } else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            console.log(error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.log('Error', error.message);
        }
        return null;
    });
    if (!quote) {
        return "Sorry, I couldn't think of anything. -Sgt Pepper Bot";
    }
    // Replace all links in quote with [hyperlink blocked]
    //find url matches
    quote = quote.replaceAll(period, ". ");
    const matches = quote.match(url);
    if (matches) {
        console.log("blocked url: " + matches[0]);
        console.log("in quote: " + quote);
    }
    quote = quote.replaceAll(url, "[hyperlink blocked]");

    const response = await openai.moderations.create({
        input: quote,
    });
    if (response.flagged) {
        console.log("Rejecting unsafe quote: " + quote);
        console.log(response);
        return await fake();
    } else {
        return quote;
    }
}

async function create() {

    const response = await openai.completions.create({
        model: 'ft:davinci-002:personal::8RWMISXN',
        prompt: "quote",
        stop: "###",
        n: 10,
        max_tokens: 250,
    });
    for (const choice of response.choices) {
        if (choice.text.match(re)) {
            console.log(choice.text);
            return choice.text;
        }
    }
    return null;
}

module.exports = {
    command,
    fake,
};
