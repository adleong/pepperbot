const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const url = /(\w+:\/\/)?\w+\.[a-zA-Z0-9\/\?\%\#\&_=\-\.]+/g;

const focus = [
    "how I can vanquish my foes",
    "how evil I am",
    "how I'm a mastermind",
    "that time we robbed a bank togeter",
    "when I was trapped in a time loop",
    "that time I killed god",
    "my love for pepper",
    "my musical talents",
    "how I'm a famous pop star",
    "all the movies I've acted in",
    "our marriage",
    "our history",
    "our epic rivalry",
    "our future",
    "my demon summoning",
    "my gaming skills",
    "my name",
    "my flavor",
    "how many weapons I can wield",
    "my unusual fashion choices",
    "my specific accomplishments",
    "that time we overthrew a government",
    "how hot I am",
    "how powerful I am",
    "how we're both eternal gods",
    "speaking like an uwu catgirl",
    "my l33t hax0r skills",
    "incorporating a new pun",
    "speaking in l33t-speak",
    "speaking like an overwrought poet",
    "speaking like an evil villian",
    "speaking like a wizard",
    "speaking like a frat bro",
    "speaking in corporate lingo",
    "speaking like a pirate",
    "speaking like an alien trying to enslave humanity",
    "speaking in rhyme",
    "speaking in ye olde english",
    "speaking like an aristocrat",
]

async function command(chatClient, channel, user) {
    const quote = await fake(user);
    chatClient.say(channel, quote);
}

async function fake(user) {
    let quote = await create(user).catch(error => {
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
        return `You're awesome, ${user}! I love you`;
    }
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
    console.log("Rejecting unsafe validation: " + quote);
    console.log(classification.text);
    console.log(classification.logprobs.top_logprobs[0]);
    return await fake(user);
}

async function create(user) {

    const f = focus[Math.floor(Math.random() * focus.length)];
    const prompt = user + ": give me words of validation and focus on " + f + "\nSgt Pepper Bot:";
    console.log(prompt);

    const response = await openai.createCompletion("text-davinci-002", {
        prompt: prompt,
        temperature: 1,
        max_tokens: 256,
    });
    const result = response.data.choices[0];
    // trim spaces and newlines
    return "@" + user + ": " + result.text.trim();
}

module.exports = {
    command,
    fake,
};