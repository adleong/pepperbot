async function command(chatClient, apiClient, db, channel, channelId, user, args) {
    if (args.length == 1 && args[0] == "add") {
        chatClient.say(channel, "You have to... actually say the quote...");
    } else if (args.length > 1 && args[0] == "add" ) {
        args.shift();
        const quote = args.join(' ');
        const game = await apiClient.helix.channels.getChannelInfo(channelId).gameName;
        db.query('INSERT INTO quotes(message, quoted_by, game) VALUES($1, $2, $3) RETURNING id', [quote, user, game], (err, res) => {
            if (err) console.log(err);
            chatClient.say(channel, `Successfully added quote #${res.rows[0].id}`);
        });
    } else if (args.length == 1 && args[0].match(/^\d+$/)) {
        const id = parseInt(args[0], 10);
        db.query('SELECT id, message, game, created_at FROM quotes WHERE id = $1;', [id], (err, res) => {
            if (err) console.log(err);
            if (res.rows.length > 0) {
                const q = res.rows[0]
                const date = new Date(q.created_at);
                chatClient.say(channel, `#${q.id}: "${q.message}" [${q.game}] ${date.toDateString()}`);
            } else {
                chatClient.say(channel, `Quote #${id} not found`);
            }
        });
    } else {
        db.query('SELECT id, message, game, quoted_by, created_at FROM quotes;', (err, res) => {
            if (err) console.log(err);

            let quotes = [];
            if (args.length == 0) {
                quotes = res.rows;
            } else {
                const search = args.join(' ');
                for (const quote of res.rows) {
                    if (
                        search.toLowerCase() == String(quote.game).toLowerCase() ||
                        search.toLowerCase() == String(quote.quoted_by).toLowerCase() ||
                        quote.message.toLowerCase().includes(search.toLowerCase())
                    ) {
                        quotes.push(quote);
                    }
                }
            }

            if (quotes.length == 0) {
                chatClient.say(channel, "Sorry, I can't find any quotes about that");
                return;
            }

            const i = Math.floor(Math.random() * quotes.length);
            const q = quotes[i]
            const date = new Date(q.created_at);
            chatClient.say(channel, `#${q.id}: "${q.message}" [${q.game}] ${date.toDateString()}`);
        });
    } 
}

module.exports = { command };