async function command(chatClient, apiClient, channel, user) {
    let u = user;
    if (user.startsWith('@')) {
        u = user.substring(1);
    }
    const target = await apiClient.users.getUserByName(u);
    if (target) {
        const target_channel = await apiClient.channels.getChannelInfo(target);
        let shoutout = `Please give a follow to the wonderful ${target_channel.displayName} over at https://twitch.tv/${target_channel.name} <3`;
        if (target_channel.gameName) {
            shoutout += ` They've been playing ${target_channel.gameName}`;
        }
        chatClient.say(channel, shoutout);
        chatClient.say(channel, `/shoutout ${target_channel.name}`)
    } else {
        chatClient.say(channel, `${u}? Never heard of them.`);
    }
    return target;
}

module.exports = { command };
