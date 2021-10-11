const awesome = require("./awesome");

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;

async function load(chatClient, db, channel, self) {
    db.query('SELECT message,period_mins FROM timers WHERE channel = $1;', [channel], (err, res) => {
        if (err) console.log(err);
        console.log("Loaded " + res.rows.length + " timers");
      
        // Register timers
        for (const timer of res.rows) {
            if (timer.period_mins === 0) continue;

            const offset = Math.floor(Math.random() * timer.period_mins);
            console.log("Registering timer on " + timer.period_mins + "m period (with " + offset + "m offset):");
            console.log(timer.message);
            setTimeout(function() {
                setInterval(function() {
                    switch (timer.message) {
                        case '!awesome':
                            awesome.command(chatClient, channel, self, db);
                            break
                        default:
                            chatClient.say(channel, timer.message);
                    }
                }, timer.period_mins * MINUTES);
            }, offset * MINUTES);
        }
    });
}

async function command(chatClient, db, channel, command) {
    const { rows } = await db.query('SELECT message FROM timers WHERE command = $1', [command]);
    if (rows.length === 1) {
        chatClient.say(channel, rows[0].message);
    }
}

module.exports = {
    command,
    load
};