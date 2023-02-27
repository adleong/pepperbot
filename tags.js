async function getTags(chatClient, apiClient, channel) {
    const broadcaster = await apiClient.users.getUserByName(channel);
    const ch = await apiClient.channels.getChannelInfo(broadcaster);
    chatClient.say(channel, `The tags are: ${ch.tags.join(', ')}`);
}

async function addTag(chatClient, apiClient, channel, tag) {
    const broadcaster = await apiClient.users.getUserByName(channel);
    const ch = await apiClient.channels.getChannelInfo(broadcaster);
    // if tags contains tag, remove it
    let tags = ch.tags;
    if (ch.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())) {
        tags = ch.tags.filter(t => t.toLowerCase() !== tag.toLowerCase());
        await apiClient.channels.updateChannelInfo(broadcaster.id, { tags });
    } else {
        tags = ch.tags.concat(tag);
        await apiClient.channels.updateChannelInfo(broadcaster.id, { tags });
    }
    chatClient.say(channel, `The tags are: ${tags.join(', ')}`);
}

async function loadTags(chatClient, apiClient, db, channel) {
    const broadcaster = await apiClient.users.getUserByName(channel);
    const ch = await apiClient.channels.getChannelInfo(broadcaster);
    const { rows } = await db.query('SELECT tag from tags where game = $1 OR game is null', [ch.game]);
    console.log(rows);
    for (let row of rows) {
        // check if tags contains row.tag, cases insensitive
        if (!ch.tags.map(t => t.toLowerCase()).includes(row.tag.toLowerCase())) {
            ch.tags.push(row.tag);
        }
    }
    chatClient.say(channel, `Setting stream tags: ${ch.tags.join(', ')}`);
    await apiClient.channels.updateChannelInfo(broadcaster.id, { tags: ch.tags });
}

module.exports = { addTag, getTags, loadTags };
