const lurks = new Map();

function lurk(chatClient, channel, user, args) {
    if (args.length > 0) {
        const activity = args.join(' ');
        chatClient.say(channel, `Thank you for the lurk, ${user}! Please enjoy ${activity}.`);
        lurks.set(user, activity);
    } else {
        chatClient.say(channel, `Thank you for the lurk, ${user}! Take it easy.`);
    }
}

function unlurk(chatClient, channel, user) {
    if (lurks.has(user)) {
        const activity = lurks.get(user);
        chatClient.say(channel, `Welcome back, ${user}! How was ${activity}?`);
    } else {
        chatClient.say(channel, `Welcome back, ${user}!`);
    }
}

module.exports = {
    lurk,
    unlurk
};