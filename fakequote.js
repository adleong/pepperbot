const { OpenAI } = require("openai");
const fakeaudit = require("./fakeaudit.js");
const openai = new OpenAI(process.env.OPENAI_API_KEY);
const re = /\-\w\w+\W*$/;

async function command(chatClient, db, channel) {
    const quote = await fake(db);
    // split quote into message of length at most 450
    for (m of quote.match(/.{1,450}/g)) {
        chatClient.say(channel, m);
    }
    return quote;
}

async function fake(db) {
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

    quote = await fakeaudit.audit(quote, db);
    if (!quote) {
        return await fake(db);
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
