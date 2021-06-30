async function command(chatClient, apiClient, channel, user, args) {
    const broadcaster = await apiClient.helix.users.getUserByName(channel);
    const u = await apiClient.helix.users.getUserByName(user);
    const ch = await apiClient.helix.channels.getChannelInfo(broadcaster);
    if (args.length == 0) {
        chatClient.say(channel, `The current title is ${ch.title}`);
    } else {
        const mod = await apiClient.helix.moderation.checkUserMod(broadcaster.id, u.id);
        if (!mod && broadcaster.id != u.id) {
            chatClient.say(channel, `Sorry, ${user}, only mods may perform this action`);
            return;
        }
        const title = args.join(' ');
        await apiClient.helix.channels.updateChannelInfo(broadcaster.id, {
               title,
        });
        chatClient.say(channel, `Title set to ${title}`);
    }
}

module.exports = { command };
