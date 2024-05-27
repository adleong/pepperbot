const { OpenAI } = require("openai");
const fakeaudit = require("./fakeaudit.js");
const pronouns = require("./pronouns.js");
const awesome = require("./awesome.js");

const openai = new OpenAI();

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
    "about their unusual fashion choices",
    "about their specific accomplishments",
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
    "speaking in gen z slang",
    "using lots of emojis",
    "comparing them to Ronaldo",
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
    "as an elaborate La-Mulana (video game) metaphor",
    "as an elaborate Celeste (video game) metaphor",
    "as an elaborate Hollow Knight (video game) metaphor",
    "as an elaborate Subnautica (video game) metaphor",
    "as an elaborate Spin Rhythm XD (video game) metaphor",
    "as an elaborate Undertale (video game) metaphor",
    "as an elaborate Outer Wilds (video game) metaphor",
    "as an elaborate Zelda (video game) metaphor",
    "as an elaborate Metroid (video game) metaphor",
    "as an elaborate Elden Ring (video game) metaphor. Arise, tarnished",
    "as an elaborate Hades (video game) metaphor",
    "as an elaborate Sayonara Wild Hearts (video game) metaphor",
    "as an elaborate Metal Gear Rising (video game) metaphor",
]

async function command(chatClient, db, channel, self, user) {
    const quote = await fake(channel, db, self, user);
    console.log(quote);
    // split quote into message of length at most 450
    for (m of quote.match(/.{1,450}/g)) {
        chatClient.say(channel, m);
    }
    return quote;
}

async function roast(chatClient, db, channel, self, user) {
    const quote = await fake(channel, db, self, user, roast = true);
    console.log(quote);
    // split quote into message of length at most 450
    for (m of quote.match(/.{1,450}/g)) {
        chatClient.say(channel, m);
    }
    return quote;
}

async function fake(channel, db, self, user, roast = false) {
    let quote = await create(channel, self, user, roast).catch(error => {
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

    quote = await fakeaudit.audit(quote, db);
    if (!quote) {
        return await fake(channel, db, self, user, roast);
    } else {
        return quote;
    }
}

async function pronounify(user) {
    const pronoun = await pronouns.get_pronouns(user).catch(() => null);
    return pronoun ? `${user} (${pronoun})` : user;
}

async function create(channel, self, user, roast = false) {

    let u = await pronounify(user);
    let prompt = roast ?
        `Playfully insult ${u} ${focus[Math.floor(Math.random() * focus.length)]}.` :
        `Give ${u} praise and validation ${focus[Math.floor(Math.random() * focus.length)]}.`;

    if (roast && Math.random() < 0.2) {
        let target = await pronounify(awesome.get(channel, self));
        if (target && target != u) {
            prompt += ` Compare them to ${target}.`;
        }
    }
    prompt += "\n";
    console.log(prompt);

    const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 60,
        temperature: 1.0,
    });

    // trim spaces and newlines
    const result = response.choices[0].message.content.trim().replaceAll("\n", " ");
    // find the last instnace of  . or ? or ! using a regex
    // and remove it and everything after it
    const lastPunctuationIndex = result.search(/[.!?][^.!?]*$/);
    return "@" + user + " " + result.substring(0, lastPunctuationIndex + 1);
}

module.exports = {
    command,
    roast,
    fake,
};
