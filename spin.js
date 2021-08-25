const SSAPI = require('ssapi-node');
const api = new SSAPI();

async function lookup(query) {
    // If arg is a number string
    if (query.match(/^\d+$/)) {
        const song = await api.getOpenData(`song/${query}`);
        if (song) {
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
    // If arg is a number string
    const song = await lookup(query).catch(err => {
        chatClient.say(channel, err);
    });
    // Insert song into database
    if (song) {
        await db.query('INSERT INTO songqueue(chart, requested_by) VALUES($1, $2) RETURNING id', [song.id, user]);
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
        await db.query('DELETE FROM songqueue WHERE chart = $1', [id]);
    } else {
        await db.query('DELETE FROM songqueue WHERE id in (SELECT id FROM songqueue ORDER BY id ASC LIMIT 1)');
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
    await db.query('DELETE FROM songqueue');
}

async function getQueue(db) {
    const { rows } = await db.query('SELECT chart FROM songqueue ORDER BY id ASC LIMIT 5');

    return Promise.all(rows.map(row => lookup(row.chart.toString())));
}

module.exports = {
    clear,
    done,
    getQueue,
    request
};