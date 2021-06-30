const { RefreshableAuthProvider, StaticAuthProvider } = require('twitch-auth');

async function provider(db, user, clientId, clientSecret) {

    console.log(`Attempting to load token for ${user}...`);
    const { rows } = await db.query('SELECT access_token, refresh_token, expiry_timestamp FROM tokens WHERE user_name = $1', [user]);
    const accessToken = rows[0].access_token;
    const refreshToken = rows[0].refresh_token;
    const expiry = new Date(rows[0].expiry_timestamp);

    console.log(`Loaded token for ${user}.  Token will expire on ${expiry}`)
    return new RefreshableAuthProvider(
        new StaticAuthProvider(clientId, accessToken),
        {
            clientSecret,
            expiry,
            onRefresh: async ({ accessToken, refreshToken, expiryDate }) => {
                console.log(`Refreshing token for ${user}.  Next refresh at ${new Date(expiryDate)}`);
                await db.query(
                    'UPDATE tokens SET access_token = $1, refresh_token = $2, expiry_timestamp = $3 WHERE user_name = $4',
                    [accessToken, refreshToken, expiryDate, user]
                );
            },
            refreshToken
        }
    );
}

module.exports = { provider };
