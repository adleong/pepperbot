async function command(chatClient, apiClient, channel, user) {
    const target = await apiClient.helix.users.getUserByName(user);
    if (target) {
        const target_channel = await apiClient.helix.channels.getChannelInfo(target);
        let shoutout = `Please give a follow to the wonderful ${target_channel.displayName} over at https://twitch.tv/${target_channel.name} <3`;
        if (target_channel.gameName) {
            shoutout += ` They've been playing ${target_channel.gameName}`;
        }
        chatClient.say(channel, shoutout);
    } else {
        chatClient.say(channel, `${user}? Never heard of them.`);
    }
    return target;
}

module.exports = { command };