const money = require('./money.js');

const seconds = 1000;
const minutes = 60 * seconds;
const hours = 60 * minutes;

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

async function nth(chatClient, apiClient, online, channel, db, user, n) {
    if (!online) {
        chatClient.say(channel, `OMG, ${user}, ${channel} isn't even live.`);
        return;
    }
    ts = Date.now();
    const guesses = await db.query('SELECT * FROM nth WHERE user_name=$1 and type=$2', [user, 'guess']);
    for (const guess of guesses.rows) {
        if (guess.user_name == user) {
            chatClient.say(channel, `Nice try, ${user}, but you already tried to be ${ordinal(guess.n)}.`);
            return;
        }
    }
    await db.query('INSERT INTO nth (user_name, n, type) VALUES ($1, $2, $3)', [user, n, 'guess']);

    const res = await db.query('SELECT * FROM nth WHERE type=$1 order by n', ['nth']);
    const winners = res.rows;

    if (winners[n - 1]) {
        const stream = await apiClient.helix.streams.getStreamByUserName(channel);
        if (stream && n == 1 && (stream.startDate < Date.now() - Number(hours))) {
            chatClient.say(channel, `${user}. Did you seriously expect to be first when stream has been live for ${timeSince(stream.startDate)}? ${winners[n - 1].user_name} beat you to it.`);
        } else {
            chatClient.say(channel, `Sorry, ${user}, but ${winners[n - 1].user_name} was ${ordinal(n)}.`);
        }
    } else if (n == 1 || winners[n - 2]) {
        await db.query('INSERT INTO nth (user_name, n, type) VALUES ($1, $2, $3)', [user, n, 'nth']);
        chatClient.say(channel, `Congrats, ${user}, on being ${ordinal(n)}!`);
        if (n == 1) {
            money.earn(chatClient, db, channel, user, 2);
        } else {
            money.earn(chatClient, db, channel, user, 1);
        }
        const maxes = await db.query('SELECT max(n) FROM nth WHERE type=$1', ['max']);
        let max = 0;
        if (maxes.rows[0].max) {
            max = maxes.rows[0].max;
        }
        if (n > max) {
            await db.query('INSERT INTO nth (user_name, n, type) VALUES ($1, $2, $3)', [user, n, 'max']);
            chatClient.say(channel, `IT'S A NEW WORLD RECORD! ${user} gets ${ordinal(n)} for the first time!`);
        }
    } else {
        chatClient.say(channel, `Sorry, ${user}, you can't be ${ordinal(n)} because nobody was ${ordinal(n - 1)}.`);
    }
}

async function firstCommand(chatClient, apiClient, online, channel, db, user) {
    await nth(chatClient, apiClient, online, channel, db, user, 1);
}

async function nthCommand(chatClient, apiClient, online, channel, db, user, arg) {
    const n = parseInt(arg);
    if (!(n > 0)) {
        await chatClient.say(channel, `${user}: nth must be a positive number.`);
        return;
    }
    nth(chatClient, apiClient, online, channel, db, user, n);
}

async function record(chatClient, db, channel) {
    const { rows } = await db.query('SELECT * FROM nth WHERE type=$1 order by n desc limit 1', ['max']);
    if (rows[0]) {
        chatClient.say(channel, `The current record is ${ordinal(rows[0].n)} by ${rows[0].user_name}.`);
    } else {
        chatClient.say(channel, `There is no record yet.`);
    }
}

async function clear(db) {
    await db.query('DELETE FROM nth WHERE type=$1', ['nth']);
    await db.query('DELETE FROM nth WHERE type=$1', ['guess']);
}

module.exports = {
    firstCommand,
    nthCommand,
    clear,
    record
};
