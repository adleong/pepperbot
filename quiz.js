
const money = require("./money");
const fake = require("./fakequote");

const re = /(.*)[-~]\W*(\w+)/;
const timer = 60 * 1000;
let quiz = null;

function pickWord(words) {
    const i = Math.floor(Math.random() * words.length);
    const word = words[i];
    const commonWords = ['the', 'of', 'and', 'a', 'to', 'in', 'is', 'you', 'that',
        'it', 'he', 'was', 'for', 'on', 'are', 'as', 'with', 'his', 'they', 'i',
        'at', 'be', 'this', 'have', 'from', 'or', 'one', 'had', 'by', 'word', 'but',
        'not', 'what', 'all', 'were', 'we', 'when', 'your', 'can', 'said', 'do',
        'say', 'her', 'she', 'an', 'will', 'would', 'their', 'so', 'up', 'out',
        'if', 'about', 'who', 'get', 'which', 'go', 'me', 'like', 'time', 'no',
        'just', 'him', 'know', 'take', 'people', 'into', 'year', 'good', 'some',
        'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only',
        'come', 'its', 'over', 'think', 'also',
    ];
    if (commonWords.includes(word.toLowerCase())) {
        return pickWord(words);
    }
    return i;
}

async function command(chatClient, apiClient, channel, db) {
    const stream = await apiClient.streams.getStreamByUserName(channel);
    if (!stream) {
        chatClient.say(channel, `No quizzes while ${channel} isn't live.`);
        return;
    }
    if (quiz !== null) {
        chatClient.say(channel, "There's already a quiz in progress.");
        return;
    }

    const { rows } = await db.query('SELECT message, game, quoted_by FROM quotes WHERE CHANNEL = $1 ORDER BY random() LIMIT 1', [channel]);
    const match = rows[0].message.match(re);
    if (!match) {
        await command(chatClient, channel, db);
        return;
    }
    chatClient.say(channel, "It's quiz time! Answer these three questions correctly to win a prize!")
    chatClient.say(channel, "ROUND 1: Who said this?");
    chatClient.say(channel, match[1]);
    chatClient.say(channel, "(You have 60 seconds to answer starting... NOW)");
    quiz = {
        correct: match[2].toLowerCase(),
        answers: {}
    }
    setTimeout(() => {
        endRound1(chatClient, channel, db);
    }, timer);
}

function answer(user, message) {
    if (quiz === null) {
        return;
    }
    quiz.answers[user] = message.toLowerCase();
}

function endRound1(chatClient, channel, db) {
    const correct = [];
    for (const key in quiz.answers) {
        if (quiz.answers[key] === "lexi") {
            quiz.answers[key] = "alex";
        }
        if (quiz.answers[key] === quiz.correct) {
            correct.push(key);
        }
    }
    if (correct.length === 0) {
        chatClient.say(channel, "Nobody answered correctly. The correct answer was " + quiz.correct);
    } else {
        chatClient.say(channel, correct.join(', ') + " got it right, it was " + quiz.correct);
    }

    Promise.all(
        correct.map(user => money.earn(chatClient, db, channel, user))
    ).then(() => {
        startRound2(chatClient, channel, db);
    });
}

async function startRound2(chatClient, channel, db) {
    const { rows } = await db.query('SELECT message, game, quoted_by FROM quotes WHERE CHANNEL = $1 ORDER BY random() LIMIT 1', [channel]);
    chatClient.say(channel, "ROUND 2: What GAME is this quote from?");
    chatClient.say(channel, rows[0].message);
    chatClient.say(channel, "(You have 60 seconds to answer starting... NOW)");
    quiz = {
        correct: rows[0].game.toLowerCase(),
        answers: {}
    }
    setTimeout(() => {
        endRound2(chatClient, channel, db);
    }, timer);
}

function endRound2(chatClient, channel, db) {
    const correct = [];
    for (const key in quiz.answers) {
        if (quiz.answers[key].replace(/[^a-z0-9]/gi, "") === quiz.correct.replace(/[^a-z0-9]/gi, "")) {
            correct.push(key);
        }
    }
    if (correct.length === 0) {
        chatClient.say(channel, "Nobody answered correctly. The correct answer was " + quiz.correct);
    } else {
        chatClient.say(channel, correct.join(', ') + " got it right, it was " + quiz.correct);
    }

    Promise.all(
        correct.map(user => money.earn(chatClient, db, channel, user))
    ).then(() => {
        startRound3(chatClient, channel, db);
    });
}

async function startRound3(chatClient, channel, db) {
    const { rows } = await db.query('SELECT message, game, quoted_by FROM quotes WHERE CHANNEL = $1 ORDER BY random() LIMIT 1', [channel]);
    const match = rows[0].message.match(re);
    if (!match) {
        await startRound3(chatClient, channel, db);
        return;
    }
    const words = match[1].trim().split(' ');
    if (words.length < 4) {
        await startRound3(chatClient, channel, db);
        return;
    }
    const i = pickWord(words);
    const word = words[i];
    words[i] = '_____';
    chatClient.say(channel, "ROUND 3: What word is missing from this quote?");
    chatClient.say(channel, words.join(' '));
    chatClient.say(channel, "(You have 60 seconds to answer starting... NOW)");
    quiz = {
        correct: word.toLowerCase(),
        answers: {}
    }
    setTimeout(() => {
        endRound3(chatClient, channel, db);
    }, timer);
}

function endRound3(chatClient, channel, db) {
    const correct = [];
    for (const key in quiz.answers) {
        if (quiz.answers[key].replace(/[^a-z0-9]/gi, "") === quiz.correct.replace(/[^a-z0-9]/gi, "")) {
            correct.push(key);
        }
    }
    if (correct.length === 0) {
        chatClient.say(channel, "Nobody answered correctly. The correct answer was " + quiz.correct);
    } else {
        chatClient.say(channel, correct.join(', ') + " got it right, it was " + quiz.correct);
    }

    // Promise.all(
    //     correct.map(user => money.earn(chatClient, db, channel, user))
    // ).then(() => {
    //     startRound4(chatClient, channel, db);
    // });
    Promise.all(
        correct.map(user => money.earn(chatClient, db, channel, user))
    ).then(() => {
        chatClient.say(channel, "Thanks for playing, everyone!");
        quiz = null;
    });
}

async function startRound4(chatClient, channel, db) {
    const real = Math.random() < 0.5;
    if (real) {
        const { rows } = await db.query('SELECT message, game, quoted_by FROM quotes WHERE CHANNEL = $1 ORDER BY random() LIMIT 1', [channel]);
        chatClient.say(channel, "ROUND 4: Is this quote 'real' or 'fake'?");
        chatClient.say(channel, rows[0].message);
        chatClient.say(channel, "(You have 60 seconds to answer starting... NOW)");
        quiz = {
            correct: 'real',
            answers: {}
        }
    } else {
        const quote = await fake.fake(db);
        chatClient.say(channel, "ROUND 4: Is this quote 'real' or 'fake'?");
        chatClient.say(channel, quote);
        chatClient.say(channel, "(You have 60 seconds to answer starting... NOW)");
        quiz = {
            correct: 'fake',
            answers: {}
        }
    }

    setTimeout(() => {
        endRound4(chatClient, channel, db);
    }, timer);
}

function endRound4(chatClient, channel, db) {
    const correct = [];
    for (const key in quiz.answers) {
        if (quiz.answers[key].replace(/[^a-z0-9]/gi, "") === quiz.correct.replace(/[^a-z0-9]/gi, "")) {
            correct.push(key);
        }
    }
    if (correct.length === 0) {
        chatClient.say(channel, "Nobody answered correctly. The correct answer was " + quiz.correct);
    } else {
        chatClient.say(channel, correct.join(', ') + " got it right, it was " + quiz.correct);
    }

    Promise.all(
        correct.map(user => money.earn(chatClient, db, channel, user))
    ).then(() => {
        chatClient.say(channel, "Thanks for playing, everyone!");
        quiz = null;
    });
}

function quiz_active() {
    return quiz !== null;
}

module.exports = { command, answer, quiz_active };
