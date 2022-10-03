const { Configuration, OpenAIApi } = require("openai");
const pronouns = require("./pronouns.js");

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const url = /(\w+:\/\/)?\w+\.[a-zA-Z0-9][a-zA-Z0-9\/\?\%\#\&_=\-\.]*/g;

const focus = [
    "about how they can vanquish my foes",
    "about how evil they are",
    "about how they are a mastermind",
    "about that time we robbed a bank togeter",
    "about when they were trapped in a time loop",
    "about that time they killed god",
    "about their love for pepper",
    "about their musical talents",
    "about how they are a famous pop star",
    "about all the movies they acted in",
    "about how you're married to them",
    "about our history",
    "about our epic rivalry",
    "about our future",
    "about their demon summoning",
    "about their gaming skills",
    "about their name",
    "about their flavor",
    "about friendship",
    "about liking the beatles",
    "about how many swords they have",
    "about how many arms they have",
    "about how many weapons they can wield",
    "about my unusual fashion choices",
    "about my specific accomplishments",
    "about that time we overthrew a government",
    "about how hot they are",
    "about how powerful they are",
    "about how we're both eternal gods",
    "about board games",
    "about being a fan of Damaplaysgames",
    "about loving Sgt Pepper Bot (he/him)",
    "about avoiding time paradoxes",
    "speaking like an uwu catgirl",
    "about their l33t hax0r skills",
    "about ergonomic sitting",
    "about how they are a famous streamer",
    "about hydration",
    "about their singing",
    "about being a Damaplaysgames viewer",
    "about getting all the collectables",
    "about looking under the elevator",
    "about saying embarrassing things",
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
    "speaking like a haughty aristocrat",
    "speaking like a southern belle",
    "speaking like a vampire",
    "speaking like a valley girl",
    "speaking like a surfer dude",
    "speaking like a poetic emo goth",
    "but spell some words wrong",
    "in rhyming couplet",
    "in a wierd way",
    "as a limeric",
    "as a haiku",
    "as a sonnet",
    "as an elaborate fishing metaphor",
    "as an elaborate sports metaphor",
    "as an elaborate figure skating metaphor",
    "as an elaborate mathematical metaphor",
    "as an elaborate musical metaphor",
    "as an elaborate astrophysics metaphor",
    "as an elaborate funk metaphor",
    "as an elaborate rock and roll metaphor",
    "as an elaborate magical metaphor",
    "as an elaborate fantasy metaphor",
    "as an elaborate sword fighting metaphor",
    "as an elaborate and creepy cult metaphor",
    "as an elaborate metaphor related to mythology",
    "as an elaborate La-Mulana metaphor"
]

async function command(chatClient, channel, user) {
    const quote = await fake(user);
    console.log(quote);
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

    const pronoun = await pronouns.get_pronouns(user).catch(() => null);
    const prompt = `Give ${user} ${pronoun ? `(${pronoun})` : ""} words of validation ${focus[Math.floor(Math.random() * focus.length)]}\n`;
    console.log(prompt);

    const response = await openai.createCompletion("text-davinci-002", {
        prompt: prompt,
        temperature: 1,
        max_tokens: 256,
    });
    const result = response.data.choices[0];
    // trim spaces and newlines
    return "@" + user + " " + result.text.trim().replaceAll("\n", " ");
}

module.exports = {
    command,
    fake,
};
