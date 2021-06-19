async function command(chatClient, db, channel, args) {
        db.query('SELECT message FROM advice;', (err, res) => {
            if (err) console.log(err);

            let advices = [];
            if (args.length == 0) {
                advices = res.rows;
            } else {
                const search = args.join(' ');
                for (const advice of res.rows) {
                    if (
                        advice.message.toLowerCase().includes(search.toLowerCase())
                    ) {
                        advices.push(advice);
                    }
                }
            }

            if (advices.length == 0) {
                chatClient.say(channel, "You're on your own, buddy");
                return;
            }

            const i = Math.floor(Math.random() * advices.length);
            chatClient.say(channel, advices[i].message);
        });
    } 

module.exports = { command };