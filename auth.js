const { RefreshingAuthProvider, getTokenInfo } = require('@twurple/auth');

const scopes = ['chat:read', 'chat:edit', 'user:edit:broadcast', 'channel:read:redemptions',
    'channel:manage:broadcast', 'moderation:read', 'moderator:manage:shoutouts', 'moderator:read:followers'];

async function provider(db, user, clientId, clientSecret) {

    console.log(`Attempting to load token for ${user}...`);
    const { rows } = await db.query('SELECT access_token, refresh_token, expiry_timestamp FROM tokens WHERE user_name = $1', [user]);
    const accessToken = rows[0].access_token;
    const refreshToken = rows[0].refresh_token;
    const expiry = rows[0].expiry_timestamp;

    //const scope = scopes.join('+').replace(/:/g, '%3A');
    //console.log(`https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=http://localhost:5000/auth&response_type=code&scope=${scope}`);

    console.log(`Loaded token for ${user}.  Token will expire in ${expiry}`)

    const info = await getTokenInfo(accessToken, clientId);
    console.log(`Token for ${user} has scopes ${info.scopes}`);

    const provider = new RefreshingAuthProvider({
        clientId,
        clientSecret,
        onRefresh: async (userId, token) => {
            console.log(`Refreshing token for ${user} with scopes ${token.scope}.  Next refresh in ${token.expiresIn}`);
            await db.query(
                'UPDATE tokens SET access_token = $1, refresh_token = $2, expiry_timestamp = $3 WHERE user_name = $4',
                [token.accessToken, token.refreshToken, token.expiresIn, user]
            );
        },
    },
    );
    await provider.addUserForToken({
        accessToken,
        expiresIn: 0,
        obtainmentTimestamp: 0,
        refreshToken,
        scope: scopes
    }, ['chat']);
    return provider;
}

module.exports = { provider, scopes };
