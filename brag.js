async function brag(chatClient, channel, db) {
    const { rows } = await db.query('SELECT message FROM brags ORDER BY random() LIMIT 1');
    chatClient.say(channel, rows[0].message);
}

module.exports = { brag };