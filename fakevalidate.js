const { Configuration, OpenAIApi } = require("openai");
const pronouns = require("./pronouns.js");

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const url = /(\w+:\/\/)?\w+\.[a-zA-Z0-9\/\?\%\#\&_=\-\.]+/g;

const focus = [
    "about how I can vanquish my foes",
    "about how evil I am",
    "about how I'm a mastermind",
    "about that time we robbed a bank togeter",
    "about when I was trapped in a time loop",
    "about that time I killed god",
    "about my love for pepper",
    "about my musical talents",
    "about how I'm a famous pop star",
    "about all the movies I've acted in",
    "about how you're married to me",
    "about our history",
    "about our epic rivalry",
    "about our future",
    "about my demon summoning",
    "about my gaming skills",
    "about my name",
    "about my flavor",
    "about how many weapons I can wield",
    "about my unusual fashion choices",
    "about my specific accomplishments",
    "about that time we overthrew a government",
    "about how hot I am",
    "about how powerful I am",
    "about how we're both eternal gods",
    "speaking like an uwu catgirl",
    "about my l33t hax0r skills",
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

    const pronoun = await pronouns.get_pronouns(user);
    const prompt = (pronoun ? `${user}'s pronouns are ${pronoun}\n\n` : "") +
        `${user}: give me words of validation ${focus[Math.floor(Math.random() * focus.length)]}\n` +
        `Sgt Pepper Bot:`;
    console.log(prompt);

    const response = await openai.createCompletion("text-davinci-002", {
        prompt: prompt,
        temperature: 1,
        max_tokens: 256,
    });
    const result = response.data.choices[0];
    // trim spaces and newlines
    return "@" + user + " " + result.text.trim();
}

module.exports = {
    command,
    fake,
};