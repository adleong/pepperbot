const SSAPI = require('ssapi-node');
const api = new SSAPI();

async function lookup(query) {
    // If arg is a number string
    if (query.match(/^\d+$/)) {
        const song = await api.getOpenData(`song/${query}`);
        if (song && song.id) {
            return song;
        }
        throw `${query} not found`;
    }
    const data = await api.postOpenData("searchCharts", {
        searchQuery: query,
        showExplicit: true
    });
    if (data.length === 0) {
        throw `${query} not found`;
    } else if (data.length > 1) {
        throw `Too many results, be more specific`;
    } else {
        return data[0];
    }
}

async function request(chatClient, channel, db, user, args) {
    const query = args.join(' ');
    const song = await lookup(query).catch(err => {
        chatClient.say(channel, err);
    });
    // Insert song into queue
    if (song) {
        const text = `#${song.id}: ${song.title} - ${song.charter} (${song.XDDifficulty})`;
        await db.query('INSERT INTO requests (spin_id, channel, title, added_by, done) VALUES ($1, $2, $3, $4, $5)',
            [song.id, channel, text, user, false]);
        chatClient.say(channel, `Adding #${song.id}: ${song.title} - ${song.charter} (${song.XDDifficulty})`);
    }
}

async function done(chatClient, channel, apiClient, db, user, id) {
    const broadcaster = await apiClient.helix.users.getUserByName(channel);
    const u = await apiClient.helix.users.getUserByName(user);
    const mod = await apiClient.helix.moderation.checkUserMod(broadcaster.id, u.id);
    if (!mod && broadcaster.id != u.id) {
        chatClient.say(channel, `Sorry, ${user}, only mods may perform this action`);
        return;
    }
    if (id) {
        await db.query('UPDATE requests SET done = true WHERE spin_id = $1 AND channel = $2', [id, channel]);
    } else {
        await db.query('UPDATE requests SET done = true WHERE id = (SELECT id from requests WHERE channel = $1 AND done = false ORDER BY id LIMIT 1)', [channel]);
    }
}

async function clear(chatClient, channel, apiClient, db, user) {
    const broadcaster = await apiClient.helix.users.getUserByName(channel);
    const u = await apiClient.helix.users.getUserByName(user);
    const mod = await apiClient.helix.moderation.checkUserMod(broadcaster.id, u.id);
    if (!mod && broadcaster.id != u.id) {
        chatClient.say(channel, `Sorry, ${user}, only mods may perform this action`);
        return;
    }
    if (queue[channel]) {
        queue[channel].splice(0);
    }
    requestCounts = new Map();
}

module.exports = {
    clear,
    done,
    queue,
    request
};