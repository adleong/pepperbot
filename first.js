const money = require('./money.js');

const seconds = 1000;
const minutes = 60 * seconds;
const hours = 60 * minutes;

let winners = [];
let ts = Date.now();
const guesses = new Map();

function expired(ts) {
    const now = Date.now();
    return now - ts > 6 * hours;
}

function expire() {
    if (expired(ts)) {
        console.log("Expiring winners");
        winners = [];
    }
    for (const [user, guess] of guesses) {
        if (expired(guess.ts)) {
            console.log("Expiring guess of " + user);
            guesses.delete(user);
        }
    }
}

function timeSince(start) {
    const now = new Date();
    let hours = now.getHours() - start.getHours();
    if (hours < 0) {
        hours += 24;
    }
    let minutes = now.getMinutes() - start.getMinutes();
    if (minutes < 0) {
        hours -= 1;
        minutes += 60;
    }
    let seconds = now.getSeconds() - start.getSeconds();
    if (seconds < 0) {
        minutes -= 1;
        seconds += 60;
    }

    let duration = "";
    if (hours > 0) {
        duration += ` ${hours} hour${hours > 1 ? 's' : ''}`;
    }
    if (minutes > 0) {
        duration += ` ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    if (seconds > 0) {
        duration += ` ${seconds} second${seconds > 1 ? 's' : ''}`;
    }

    return duration;
}

function ordinal(n) {
    const s = n % 100;
    if (s > 10 && s < 21) {
        return `${n}th`;
    }
    switch (s % 10) {
        case 1:
            return `${n}st`;
        case 2:
            return `${n}nd`;
        case 3:
            return `${n}rd`;
        default:
            return `${n}th`;
    }
}

async function nth(chatClient, apiClient, channel, db, user, n) {
    expire();
    const stream = await apiClient.helix.streams.getStreamByUserName(channel);
    if (!stream) {
        chatClient.say(channel, `OMG, ${user}, ${channel} isn't even live.`);
        return;
    }
    ts = Date.now();
    if (guesses.has(user)) {
        const guess = guesses.get(user);
        chatClient.say(channel, `Nice try, ${user}, but you already tried to be ${guess.guess}.`);
        return;
    }
    guesses.set(user, {
        guess: ordinal(n),
        ts: Date.now()
    });
    if (winners[n - 1]) {
        if (n == 1 && (stream.startDate < Date.now() - Number(hours))) {
            chatClient.say(channel, `${user}. Did you seriously expect to be first when stream has been live for ${timeSince(stream.startDate)}? ${winners[n - 1]} beat you to it.`);
        } else {
            chatClient.say(channel, `Sorry, ${user}, but ${winners[n - 1]} was ${ordinal(n)}.`);
        }
    } else if (n == 1 || winners[n - 2]) {
        winners.push(user);
        chatClient.say(channel, `Congrats, ${user}, on being ${ordinal(n)}!`);
        if (n == 1) {
            money.earn(chatClient, db, channel, user, 2);
        } else {
            money.earn(chatClient, db, channel, user, 1);
        }
    } else {
        chatClient.say(channel, `Sorry, ${user}, you can't be ${ordinal(n)} because nobody was ${ordinal(n - 1)}.`);
    }
}

async function firstCommand(chatClient, apiClient, channel, db, user) {
    await nth(chatClient, apiClient, channel, db, user, 1);
}

async function nthCommand(chatClient, apiClient, channel, db, user, arg) {
    const n = parseInt(arg);
    if (!(n > 0)) {
        await chatClient.say(channel, `${user}: nth must be a positive number.`);
        return;
    }
    nth(chatClient, apiClient, channel, db, user, n);
}

module.exports = {
    firstCommand,
    nthCommand
};