let i = 0;
const messages = ["", "", ""];
const users = ["", "", ""];
const length = 3;

function prev(x) {
    return (i - x + length) % length;
}

async function add(chatClient, channel, user, msg) {
    if (msg.startsWith("!")) {
        return;
    }
    if (msg.toLowerCase().includes("of all time") && !msg.includes("?")) {
        await chatClient.say(channel, "so true");
        return;
    }
    const message = msg.toLowerCase().replace(/[.,/?#!$%^&*;:{}=\-_`~()]/g, "")
    messages[i] = message;
    users[i] = user;
    if (message === messages[prev(1)] && message === messages[prev(2)] &&
        user !== users[prev(1)] && user !== users[prev(2)]) {
        // One in 20 times, say Lea! instead.
        if (Math.random() < 0.05) {
            await chatClient.say(channel, "Lea!");
        } else {
            await chatClient.say(channel, message);
        }
        messages[i] = "";
        users[i] = "";
    }
    if (message === messages[prev(1)] &&
        user === users[prev(1)]) {
        // One in 20 times, say Lea! instead.
        if (Math.random() < 0.05) {
            await chatClient.say(channel, "Lea!");
        } else {
            await chatClient.say(channel, `${message}?`);
        }
        messages[i] = "";
        users[i] = "";
    }
    i = (i + 1) % length;
}

module.exports = { add };
