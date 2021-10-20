const awesome = require("./awesome");

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;

const timers = {};

async function load(chatClient, db, channel, self) {
    db.query('SELECT message,period_mins,command FROM timers WHERE channel = $1;', [channel], (err, res) => {
        if (err) console.log(err);
        console.log("Loaded " + res.rows.length + "  commands");
      
        // Register timers
        for (const timer of res.rows) {
            if (!timer.period_mins) continue;

            const offset = Math.floor(Math.random() * timer.period_mins);
            console.log("Registering timer on " + timer.period_mins + "m period (with " + offset + "m offset) for " + channel + ":");
            console.log(timer.message);
            setTimeout(function() {
                const handle = setInterval(function() {
                    switch (timer.message) {
                        case '!awesome':
                            awesome.command(chatClient, channel, self, db)
                            break
                        default:
                            chatClient.say(channel, timer.message);
                    }
                }, timer.period_mins * MINUTES);
                timers[[channel, timer.command]] = handle;
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

async function addCommand(chatClient, db, channel, cmd, message) {
    if (!cmd) {
        chatClient.say(channel, "Usage: !addcommand (command) (message)");
        return;
    }
    let command = cmd;
    if (!command.startsWith("!")) {
        command = "!" + command;
    }

    const { rows } = await db.query('SELECT FROM timers WHERE channel = $1 AND command = $2', [channel, command])
    if (rows.length !== 0) {
        chatClient.say(channel, `Command ${command} already exists`);
        return;
    }
    await db.query('INSERT INTO timers (channel, command, message) VALUES ($1, $2, $3)', [channel, command, message]);
    chatClient.say(channel, `Command ${command} added`);
}

async function addTimer(chatClient, db, channel, self, cmd, message, period_mins) {
    let command = cmd;
    if (!command || !(period_mins*1)) {
        chatClient.say(channel, "Usage: !addtimer (command) (period) (message)");
        return;
    }
    if (!command.startsWith("!")) {
        command = "!" + command;
    }
    const { rows } = await db.query('SELECT FROM timers WHERE channel = $1 AND command = $2', [channel, command])
    if (rows.length !== 0) {
        chatClient.say(channel, `Command ${command} already exists`);
        return;
    }
    await db.query('INSERT INTO timers (channel, command, message, period_mins) VALUES ($1, $2, $3, $4)', [channel, command, message, period_mins]);
    chatClient.say(channel, `Timer ${command} added with ${period_mins}m interval`);
    const handle = setInterval(function() {
        switch (message) {
            case '!awesome':
                awesome.command(chatClient, channel, self, db);
                break
            default:
                chatClient.say(channel, message);
        }
    }, period_mins * MINUTES);
    timers[[channel, command]] = handle;
}

async function remove(chatClient, db, channel, cmd) {
    let command = cmd;
    if (!command) {
        chatClient.say(channel, "Usage: !remove (command)");
        return;
    }
    if (!command.startsWith("!")) {
        command = "!" + command;
    }

    const { rows } = await db.query('SELECT FROM timers WHERE channel = $1 AND command = $2', [channel, command])
    if (rows.length === 0) {
        chatClient.say(channel, `Command ${command} not found`);
        return;
    }
    await db.query('DELETE FROM timers WHERE channel = $1 AND command = $2', [channel, command]);
    const handle = timers[[channel, command]];
    if (handle) {
        clearInterval(handle);
        delete timers[[channel, command]];
    }
    chatClient.say(channel, `Command ${command} removed`);
}

async function getCommands(db, channel) {
    const { rows } = await db.query('SELECT command FROM timers WHERE channel = $1', [channel])
    return rows.map(row => row.command);
}

module.exports = {
    addCommand,
    addTimer,
    command,
    getCommands,
    load,
    remove
};