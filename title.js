async function command(chatClient, apiClient, channel, user, args) {
    const broadcaster = await apiClient.users.getUserByName(channel);
    const u = await apiClient.users.getUserByName(user);
    const ch = await apiClient.channels.getChannelInfoById(broadcaster);
    if (args.length == 0) {
        chatClient.say(channel, `The current title is ${ch.title}`);
    } else {
        const mod = await apiClient.moderation.checkUserMod(broadcaster.id, u.id);
        if (!mod && broadcaster.id != u.id) {
            chatClient.say(channel, `Sorry, ${user}, only mods may perform this action`);
            return;
        }
        const title = args.join(' ');
        await apiClient.channels.updateChannelInfo(broadcaster.id, {
               title,
        });
        chatClient.say(channel, `Title set to ${title}`);
    }
}

module.exports = { command };
