const SECONDS = 1000;
const MINUTES = 60 * SECONDS;

async function load(chatClient, db, channel) {
    db.query('SELECT message,period_mins FROM timers;', (err, res) => {
        if (err) console.log(err);
        console.log("Loaded " + res.rows.length + " timers");
      
        // Register timers
        for (const timer of res.rows) {
            const offset = Math.floor(Math.random() * timer.period_mins);
            console.log("Registering timer on " + timer.period_mins + "m period (with " + offset + "m offset):");
            console.log(timer.message);
            setTimeout(function() {
                setInterval(function() {
                    chatClient.say(channel, timer.message);
                }, timer.period_mins * MINUTES);
            }, offset * MINUTES);
        }
    });
}

module.exports = { load };