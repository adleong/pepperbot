async function command(apiClient, chatClient, channel, user) {
    const target = await apiClient.helix.users.getUserByName(user);
    const target_channel = await apiClient.helix.channels.getChannelInfo(target);
    chatClient.say(
        channel,
        `Shoutout to ${target_channel.displayName}! Follow them at https://twitch.tv/${target_channel.name} They were playing ${target_channel.gameName}`
    );
}

module.exports = { command };