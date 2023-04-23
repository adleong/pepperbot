async function command(chatClient, apiClient, channel, user) {
    const broadcaster = await apiClient.users.getUserByName(channel);
    let u = user;
    if (user.startsWith('@')) {
        u = user.substring(1);
    }
    const target = await apiClient.users.getUserByName(u);
    if (target) {
        const target_channel = await apiClient.channels.getChannelInfoById(target);
        let shoutout = `Please give a follow to the wonderful ${target_channel.displayName} over at https://twitch.tv/${target_channel.name} <3`;
        if (target_channel.gameName) {
            shoutout += ` They've been playing ${target_channel.gameName}`;
        }
        chatClient.say(channel, shoutout);
        chatClient.say(channel, `/shoutout ${target_channel.name}`)
        await apiClient.chat.shoutoutUser(broadcaster.id, target.id, broadcaster.id).catch((err) => {
            console.log("shoutout failed:");
            console.log(err);
        });
    } else {
        chatClient.say(channel, `${u}? Never heard of them.`);
    }
    return target;
}

module.exports = { command };
