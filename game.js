async function command(chatClient, apiClient, channel, user, args) {
    const broadcaster = await apiClient.helix.users.getUserByName(channel);
    const u = await apiClient.helix.users.getUserByName(user);
    const ch = await apiClient.helix.channels.getChannelInfo(broadcaster);
    if (args.length == 0) {
        chatClient.say(channel, `The current game is ${ch.gameName}`);
    } else {
        const mod = await apiClient.helix.moderation.checkUserMod(broadcaster.id, u.id);
        if (!mod && broadcaster.id != u.id) {
            chatClient.say(channel, `Sorry, ${user}, only mods may perform this action`);
            return;
        }
        const gameName = args.join(' ');
        const game = await apiClient.helix.games.getGameByName(gameName);
        if (game) {
            await apiClient.helix.channels.updateChannelInfo(broadcaster.id, {
                gameId: game.id,
            });
            chatClient.say(channel, `Game set to ${game.name}`);
        } else {
            chatClient.say(channel, `wh... what kind of game is ${gameName}?`);
        }
    }
}

module.exports = { command };
