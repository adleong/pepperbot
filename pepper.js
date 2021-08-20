const Duration = require("duration-js");

function pluralize(amount, unit) {
    if (amount > 1) {
        return amount + " " + unit + "s";
    }
    return amount + " " + unit;
}

function formatDuration(dur) {
    const year = 365 * Duration.day;
    const month = 30 * Duration.day;

    const out = [];
    let d = dur;

    if (d > year) {
        const years = Math.floor(d / year);
        out.push(pluralize(years, "year"));
        d = Duration.subtract(d, years * year);
    }
    if (d > month) {
        const months = Math.floor(d / month)
        out.push(pluralize(months, "month"));
        d = Duration.subtract(d, months * month);
    }
    if (d.weeks() > 0) {
        out.push(pluralize(d.weeks(), "week"));
        d = Duration.subtract(d, d.weeks() * Duration.week);
    }
    if (d.days() > 0) {
        out.push(pluralize(d.days(), "day"));
        d = Duration.subtract(d, d.days() * Duration.day);
    }
    if (d.hours() > 0) {
        out.push(pluralize(d.hours(), "hour"));
        d = Duration.subtract(d, d.hours() * Duration.hour);
    }
    if (d.minutes() > 0) {
        out.push(pluralize(d.minutes(), "minute"));
        d = Duration.subtract(d, d.minutes() * Duration.minute);
    }
    return out.join(' ');
}

function report(chatClient, channel, user, minutes) {
    const duration = formatDuration(new Duration(minutes * Duration.minute));
    chatClient.say(channel, `${user} has redeemed ${duration.toString()} of pepper time in total.`);
}

async function command(chatClient, db, channel, user, minutes) {
    const { rows } = await db.query('SELECT pepper_minutes FROM peppertime WHERE user_name = $1', [user]);
    let pepper = 0;
    if (rows.length > 0) {
        pepper = rows[0].pepper_minutes;
    }
    pepper += minutes;
    report(chatClient, channel, user, pepper);
    if (rows.length == 0) {
        await db.query('INSERT INTO peppertime (user_name, pepper_minutes) VALUES($1, $2)', [user, pepper]);
    } else {
        await db.query('UPDATE peppertime SET pepper_minutes = $1 WHERE user_name = $2', [pepper, user]);
    }
}

async function leaders(chatClient, db, channel) {
    const { rows } = await db.query('SELECT user_name, pepper_minutes FROM peppertime ORDER BY pepper_minutes DESC LIMIT 3');
    chatClient.say(channel, 'Your super shaker pepper cam leaders are:');
    if (rows.length == 0) {
        chatClient.say(channel, 'No one. For shame.');
    }
    for (const row of rows) {
        report(chatClient, channel, row.user_name, row.pepper_minutes);
    }
}

async function leadersResults(db) {
    console.log("querying");
    const { rows } = await db.query('SELECT user_name, pepper_minutes FROM peppertime ORDER BY pepper_minutes DESC LIMIT 3');
    console.log(rows);
    return rows.map(row => ({
        'name': row.user_name,
        'time': formatDuration(new Duration(row.pepper_minutes * Duration.minute))
    }));
}

module.exports = {
    command,
    leaders,
    leadersResults,
};