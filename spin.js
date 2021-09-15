const SSAPI = require('ssapi-node');
const api = new SSAPI();

const queue = [];

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
    // Insert song into database
    if (song) {
        queue.push(song);
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
        var i = 0;
        while (i < queue.length) {
            if (queue[i].id == id) {
                queue.splice(i, 1);
                break;
            }
            i++;
        }
    } else {
        queue.splice(0, 1);
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
    queue.splice(0);
}

module.exports = {
    clear,
    done,
    queue,
    request
};