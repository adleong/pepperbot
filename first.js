const money = require('./money.js');

const seconds = 1000;
const minutes = 60 * seconds;
const hours = 60 * minutes;

let first = {};
let second = {};
let guesses = new Map();

function expired(ts) {
    const now = Date.now();
    return now - ts > 6 * hours;
}

function expire() {
    if (first && expired(first.ts)) {
        console.log("Expiring first");
        first = {};
    }
    if (second && expired(second.ts)) {
        console.log("Expiring second");
        second = {};
    }
    for (let [user, guess] of guesses) {
        if (expired(guess.ts)) {
            console.log("Expiring guess of " + user);
            guesses.delete(user);
        }
    }
}

async function firstCommand(chatClient, apiClient, channel, db, user) {
    expire();
    const stream = await apiClient.streams.getStreamByUserName(channel);
    if (!stream) {
        chatClient.say(channel, `OMG, ${user}, ${channel} isn't even live.`);
        return;
    }
    if (guesses.has(user)) {
        const guess = guesses.get(user);
        chatClient.say(channel, `Nice try, ${user}, but you already tried to be ${guess.guess}.`);
        return;
    }
    guesses.set(user, {
        guess: 'first',
        ts: Date.now()
    });
    if (first && first.user) {
        chatClient.say(channel, `Sorry, ${user}, but ${first.user} was first.`);
        return;
    }
    chatClient.say(channel, `Congrats, ${user}, on being first!`);
    money.earn(chatClient, db, channel, user);
}

async function secondCommand(chatClient, apiClient, channel, db, user) {
    expire();
    const stream = await apiClient.streams.getStreamByUserName(channel);
    if (!stream) {
        chatClient.say(channel, `OMG, ${user}, ${channel} isn't even live.`);
        return;
    }
    if (guesses.has(user)) {
        const guess = guesses.get(user);
        chatClient.say(channel, `Nice try, ${user}, but you already tried to be ${guess.guess}.`);
        return;
    }
    guesses.set(user, {
        guess: 'second',
        ts: Date.now()
    });
    if (!first || !first.user) {
        chatClient.say(channel, `Sorry, ${user}, you can't be second because nobody was first.`);
        return;
    }
    if (second && second.user) {
        chatClient.say(channel, `Sorry, ${user}, but ${second.user} was second.`);
        return;
    }
    chatClient.say(channel, `Congrats, ${user}, on being second!`);
    money.earn(chatClient, db, channel, user);
}

module.exports = {
    firstCommand,
    secondCommand
};