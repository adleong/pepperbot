async function command(chatClient, apiClient, channel, user) {
    const target = await apiClient.helix.users.getUserByName(user);
    if (target) {
        const target_channel = await apiClient.helix.channels.getChannelInfo(target);
        let shoutout = `Shoutout to ${target_channel.displayName}! Follow them at https://twitch.tv/${target_channel.name}`;
        if (target_channel.gameName) {
            shoutout = shoutout + ` They were playing ${target_channel.gameName}`;
        }
        chatClient.say(channel, shoutout);
    } else {
        chatClient.say(channel, `${user}? Never heard of them.`);
    }
}

module.exports = { command };