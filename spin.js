const SSAPI = require('ssapi-node');
const api = new SSAPI();

let closed = false;

async function lookup(query, by) {
    // If arg is a number string
    if (query.match(/^\d+$/)) {
        const song = await api.getOpenData(`song/${query}`);
        if (song && song.id) {
            return song;
        }
        throw `${query} not found`;
    }
    const matches = query.match(/^https:\/\/spinsha.re\/song\/(\d+)/);
    if (matches) {
        const song = await api.getOpenData(`song/${matches[1]}`);
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
        if (by) {
            const filtered = data.filter(song =>
                song.artist.toLowerCase() == by.toLowerCase() ||
                song.charter.toLowerCase() == by.toLowerCase());
            if (filtered.length == 0) {
                throw `Could not find such a chart by ${by}`;
            }
            if (filtered.length == 1) {
                return filtered[0];
            }
        }
        throw `Too many results, be more specific`;
    } else {
        return data[0];
    }
}

async function request(chatClient, channel, db, user, args) {
    if (closed) {
        chatClient.say(channel, `Sorry, ${user}, requests are closed`);
        return;
    }
    const query = args.filter(w => !w.startsWith("by:")).join(' ');
    const byArg = args.filter(w => w.startsWith("by:"))[0];
    let by = null;
    if (byArg) {
        by = byArg.slice(3);
    }
    const song = await lookup(query, by).catch(err => {
        chatClient.say(channel, err);
    });
    // Insert song into queue
    if (song) {
        if (song.id == 2880) {
            chatClient.say(channel, "No.");
            return;
        }
        const text = `#${song.id}: ${song.title} - ${song.charter} (${song.XDDifficulty})`;
        const { rows } = await db.query('SELECT count(1) from requests where channel = $1 and added_by = $2', [channel, user]);
        const priority = rows[0].count;
        const res = await db.query('INSERT INTO requests (spin_id, channel, title, added_by, priority, done) VALUES ($1, $2, $3, $4, $5, $6)',
            [song.id, channel, text, user, priority, false]);
        console.log(`Inserting ${res.rowCount} song: ${song.id}`);
        chatClient.say(channel, `Adding #${song.id}: ${song.title} - ${song.charter} (${song.XDDifficulty})`);
    }
}

async function done(chatClient, channel, apiClient, db, user, id) {
    const broadcaster = await apiClient.users.getUserByName(channel);
    const u = await apiClient.users.getUserByName(user);
    const mod = await apiClient.moderation.checkUserMod(broadcaster.id, u.id);
    if (!mod && broadcaster.id != u.id) {
        chatClient.say(channel, `Sorry, ${user}, only mods may perform this action`);
        return;
    }
    if (id) {
        const res = await db.query('UPDATE requests SET done = true WHERE spin_id = $1 AND channel = $2', [id, channel]);
        console.log(`Done ${res.rowCount} song: ${id}`);
    } else {
        const res = await db.query('UPDATE requests SET done = true WHERE id = (' +
            'SELECT id FROM requests ' +
            'WHERE channel=$1 AND DONE=false ' +
            'ORDER BY priority, id LIMIT 1)', [channel]);
        console.log(`Done ${res.rowCount} song`);
    }
}

async function clear(chatClient, channel, apiClient, db, user) {
    const broadcaster = await apiClient.users.getUserByName(channel);
    const u = await apiClient.users.getUserByName(user);
    const mod = await apiClient.moderation.checkUserMod(broadcaster.id, u.id);
    if (!mod && broadcaster.id != u.id) {
        chatClient.say(channel, `Sorry, ${user}, only mods may perform this action`);
        return;
    }
    await db.query('DELETE FROM requests WHERE channel = $1', [channel]);
}

async function queue(channel, db) {
    const { rows } = await db.query(
        'SELECT title, added_by FROM requests ' +
        'WHERE channel=$1 AND done=false ' +
        'ORDER BY priority, id', [channel]);
    return rows;
}

function close() {
    closed = true;
}

function open() {
    closed = false;
}

module.exports = {
    clear,
    done,
    queue,
    request,
    close,
    open,
};
