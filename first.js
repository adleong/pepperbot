const money = require('./money.js');

const seconds = 1000;
const minutes = 60 * seconds;
const hours = 60 * minutes;

let first = {};
let second = {};
const guesses = new Map();

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
    for (const [user, guess] of guesses) {
        if (expired(guess.ts)) {
            console.log("Expiring guess of " + user);
            guesses.delete(user);
        }
    }
}

function timeSince(start) {
    const now = Date.now();
    let hours = now.getHours() - start.getHours();
    let minutes = now.getMinutes() - start.getMinutes();
    if (minutes < 0) {
        hours -= 1;
        minutes += 60;
    }

    let duration = "";
    if (hours > 0) {
        duration += ` ${hours} hour${hours > 1 ? 's' : ''}`;
    }
    if (minutes > 0) {
        duration += ` ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    return duration;
}

async function firstCommand(chatClient, apiClient, channel, db, user) {
    expire();
    const stream = await apiClient.helix.streams.getStreamByUserName(channel);
    // if (!stream) {
    //     chatClient.say(channel, `OMG, ${user}, ${channel} isn't even live.`);
    //     return;
    // }
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
        if (stream.startDate < Date.now() - Number(hours)) {
            chatClient.say(channel, `${user}. Did you seriously expect to be first when stream has been live for ${timeSince(stream.startDate)}? ${first.user} beat you to it.`);
        } else {
            chatClient.say(channel, `Sorry, ${user}, but ${first.user} was first.`);
        }
        return;
    }
    first = {
        user,
        ts: Date.now()
    };
    chatClient.say(channel, `Congrats, ${user}, on being first ${timeSince(stream.startDate)} since the start of stream!`);
    money.earn(chatClient, db, channel, user, 2);
}

async function secondCommand(chatClient, apiClient, channel, db, user) {
    expire();
    const stream = await apiClient.helix.streams.getStreamByUserName(channel);
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
        if (stream.startDate < Date.now() - Number(hours)) {
            chatClient.say(channel, `${user}. Did you seriously expect to be second when stream has been live for ${timeSince(stream.startDate)}? ${first.user} beat you to it.`);
        } else {
            chatClient.say(channel, `Sorry, ${user}, but ${second.user} was second.`);
        }
        return;
    }
    second = {
        user: user,
        ts: Date.now()
    };
    chatClient.say(channel, `Congrats, ${user}, on being second ${timeSince(stream.startDate)} since the start of stream!`);
    money.earn(chatClient, db, channel, user);
}

module.exports = {
    firstCommand,
    secondCommand
};