const { RefreshingAuthProvider, StaticAuthProvider } = require('@twurple/auth');

async function provider(db, user, clientId, clientSecret) {

    console.log(`Attempting to load token for ${user}...`);
    const { rows } = await db.query('SELECT access_token, refresh_token, expiry_timestamp FROM tokens WHERE user_name = $1', [user]);
    const accessToken = rows[0].access_token;
    const refreshToken = rows[0].refresh_token;
    const expiry = rows[0].expiry_timestamp;

    console.log(`Loaded token for ${user}.  Token will expire in ${expiry}`)
    const scopes = ['chat:read', 'chat:edit', 'user:edit:broadcast', 'channel:read:redemptions',
    'channel:manage:broadcast', 'moderation:read'];
    return new RefreshingAuthProvider({
            clientId,
            clientSecret,
            onRefresh: async token => {
                console.log(`Refreshing token for ${user}.  Next refresh in ${token.expiresIn}`);
                await db.query(
                    'UPDATE tokens SET access_token = $1, refresh_token = $2, expiry_timestamp = $3 WHERE user_name = $4',
                    [token.accessToken, token.refreshToken, token.expiresIn, user]
                );
            }
        },
        {
            accessToken,
            expiresIn: 0,
            obtainmentTimestamp: 0,
            refreshToken,
            scope: scopes
        }
    );
}

module.exports = { provider };
