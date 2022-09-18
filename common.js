async function get_follows(apiClient, target) {
    const t = target.startsWith('@') ? target.substring(1) : target;
    const user = await apiClient.helix.users.getUserByName(t);
    if (!user) {
        return [];
    }
    const cursor = apiClient.helix.users.getFollowsPaginated({ user: user.id });
    const follows = [];
    for await (const f of cursor) {
        follows.push(f.followedUserName)
    }
    return follows;
}

async function get_followers(apiClient, target) {
    const t = target.startsWith('@') ? target.substring(1) : target;
    const user = await apiClient.helix.users.getUserByName(t);
    if (!user) {
        return [];
    }
    const cursor = apiClient.helix.users.getFollowsPaginated({ followedUser: user.id });
    const followers = [];
    for await (const f of cursor) {
        followers.push(f.userName)
    }
    return followers;
}

async function command(apiClient, user, target) {
    if (!user) {
        return null;
    }
    const my_follows = await get_follows(apiClient, user);
    const my_followers = await get_followers(apiClient, user);

    if (!target) {
        return null;
    }
    const your_follows = await get_follows(apiClient, target);
    const your_followers = await get_followers(apiClient, target);

    const common_follows = [];
    for (x of my_follows) {
        for (y of your_follows) {
            if (x == y) {
                common_follows.push(x);
            }
        }
    }

    const common_followers = [];
    for (x of my_followers) {
        for (y of your_followers) {
            if (x == y) {
                common_followers.push(x);
            }
        }
    }

    return {
        'common_follows': common_follows,
        'common_followers': common_followers
    };
}

module.exports = { command };
