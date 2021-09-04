async function command(chatClient, apiClient, channel, user) {
    let u = user;
    if (user.startsWith('@')) {
        u = user.substring(1);
    }
    const target = await apiClient.helix.users.getUserByName(u);
    if (target) {
        const target_channel = await apiClient.helix.channels.getChannelInfo(target);
        let shoutout = `Please give a follow to the wonderful ${target_channel.displayName} over at https://twitch.tv/${target_channel.name} <3`;
        if (target_channel.gameName) {
            shoutout += ` They've been playing ${target_channel.gameName}`;
        }
        chatClient.say(channel, shoutout);
    } else {
        chatClient.say(channel, `${u}? Never heard of them.`);
    }
    return target;
}

async function increment(db, user) {
    const { rows } = await db.query('SELECT shoutouts FROM shoutouts WHERE user_name = $1', [user]);
    let shouts = 0;
    if (rows.length > 0) {
        shouts = rows[0].shoutouts;
    }
    shouts += 1;
    if (rows.length == 0) {
        await db.query('INSERT INTO shoutouts (user_name, shoutouts) VALUES($1, $2)', [user, shouts]);
    } else {
        await db.query('UPDATE shoutouts SET shoutouts = $1 WHERE user_name = $2', [shouts, user]);
    }
}

async function leaders(db) {
    const { rows } = await db.query('SELECT user_name, shoutouts FROM shoutouts ORDER BY shoutouts DESC LIMIT 3');
    return rows.map(row => ({
        'name': row.user_name,
        'shoutouts': row.shoutouts
    }));
}

module.exports = { command, increment, leaders };