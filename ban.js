const axios = require('axios');

function rand(xs) {
    return xs[Math.floor(Math.random() * xs.length)];
}

async function theyHave(user) {
    return axios.get(`https://pronouns.alejo.io/api/users/${user}`).then(res => {
        if (res.data[0].pronoun_id.startsWith('she')) {
            return "she has";
        } else if (res.data[0].pronoun_id.startsWith('he')) {
            return "he has";
        } else {
            return "they have";
        }
    }).catch(() => "they have");
}

async function them(user) {
    return axios.get(`https://pronouns.alejo.io/api/users/${user}`).then(res => {
        if (res.data[0].pronoun_id.startsWith('she')) {
            return "her";
        } else if (res.data[0].pronoun_id.startsWith('he')) {
            return "him";
        } else {
            return "them";
        }
    }).catch(() => "them");
}

async function theyMake(user) {
    return axios.get(`https://pronouns.alejo.io/api/users/${user}`).then(res => {
        if (res.data[0].pronoun_id.startsWith('she')) {
            return "she makes";
        } else if (res.data[0].pronoun_id.startsWith('he')) {
            return "he makes";
        } else {
            return "they make";
        }
    }).catch(() => "they make");
}

function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

async function theyAre(user) {
    return axios.get(`https://pronouns.alejo.io/api/users/${user}`).then(res => {
        if (res.data[0].pronoun_id.startsWith('she')) {
            return "she is";
        } else if (res.data[0].pronoun_id.startsWith('he')) {
            return "he is";
        } else {
            return "they are";
        }
    }).catch(() => "they are");
}

async function they(user) {
    return axios.get(`https://pronouns.alejo.io/api/users/${user}`).then(res => {
        if (res.data[0].pronoun_id.startsWith('she')) {
            return "she";
        } else if (res.data[0].pronoun_id.startsWith('he')) {
            return "he";
        } else {
            return "they";
        }
    }).catch(() => "they");
}


async function command(chatClient, apiClient, channel, bot, user, target) {
    const broadcaster = await apiClient.helix.users.getUserByName(channel);
    let t = target.toLowerCase();
    if (target.startsWith('@')) {
        t = target.substring(1);
    }

    if (t == bot || t == channel) {
        chatClient.say(channel, rand([
            'No.',
            'Nice try.',
            'Nope.',
            'Nah.',
            'Not gonna happen.',
            'Stop.',
            'Did you really think that would work?'
        ]));
        return;
    }

    if (t == user) {
        chatClient.say(channel, `Do not ban yourself ${user}. ` + rand([
            'You are valued.',
            'You are valid.',
            'We like having you here.',
            'You are loved',
            'You are appreciated.',
            'You deserve to be here.'
        ]));
        return;
    }

    t = await apiClient.helix.users.getUserByName(t).catch(() => null);
    if (!t) {
        const msg = [
            `${target} is now officially cancelled.`,
            `${target} may no longer be discussed.`,
            `The abstract concept of ${target} has been banned.`,
        ]
        chatClient.say(channel, rand(msg));
        return;
    }

    const intro = rand([
        `Ban ${t.displayName}? How dare you, ${user}.`,
        `I would NEVER ban ${t.displayName}, ${user}.`,
        `${t.displayName} is now banned... lol NOT.`,
        `I cannot believe that you would even suggest banning ${t.displayName}, ${user}.`,
        `Can you believe the AUDACITY of ${user} trying to ban ${t.displayName}?`
    ])

    const follow = await t.getFollowTo(broadcaster);
    if (follow) {
        console.log(`Follow date of ${t.displayName} is ${follow.followDate}`);
        const now = new Date();
        let years = now.getFullYear() - follow.followDate.getFullYear();
        let months = now.getMonth() - follow.followDate.getMonth();
        if (months < 0) {
            years -= 1;
            months += 12;
        }
        let days = now.getDate() - follow.followDate.getDate();
        if (days < 0) {
            months -= 1;
            days += 30;
        }
        let hours = now.getHours() - follow.followDate.getHours();
        if (hours < 0) {
            days -= 1;
            hours += 24;
        }
        let minutes = now.getMinutes() - follow.followDate.getMinutes();
        if (minutes < 0) {
            hours -= 1;
            minutes += 60;
        }

        let followMsg = cap(await theyHave(t.displayName)) + ` been following for`;
        if (years > 0) {
            followMsg += ` ${years} year${years > 1 ? 's' : ''}`;
        }
        if (months > 0) {
            followMsg += ` ${months} month${months > 1 ? 's' : ''}`;
        }
        if (days > 0) {
            followMsg += ` ${days} day${days > 1 ? 's' : ''}`;
        }
        if (hours > 0) {
            followMsg += ` ${hours} hour${hours > 1 ? 's' : ''}`;
        }
        if (minutes > 0) {
            followMsg += ` ${minutes} minute${minutes > 1 ? 's' : ''}`;
        }
        followMsg += `.`;

        let conclusion = rand([
            `I'm so glad ${await theyAre(t.displayName)} here.`,
            "That wouldn't be very welcoming.",
            `${cap(await they(t.displayName))} seem very cool.`,
        ])

        if (months >= 1) {
            conclusion = rand([
                `${cap(await theyMake(t.displayName))} this channel a better place.`,
                `${cap(await theyAre(t.displayName))} a great person.`,
                `We love ${await them(t.displayName)}.`,
            ])
        }

        if (months >= 3) {
            conclusion = rand([
                `${cap(await theyAre(t.displayName))} a pillar of the community.`,
                `I treasure ${await them(t.displayName)}.`,
                `${cap(await theyAre(t.displayName))} part of what makes this channel so great.`
            ])
        }

        if (months >= 6) {
            conclusion = rand([
                `${cap(await theyAre(t.displayName))} part of the foundation of this channel.`,
                `${cap(await theyAre(t.displayName))} my one of my oldest friends.`,
                `I treasure ${await them(t.displayName)} more than you will ever know.`
            ])
        }

        if (years >= 1) {
            conclusion = rand([
                `${cap(await theyAre(t.displayName))} a true original.`,
                `${cap(await theyHave(t.displayName))} been part of this channel longer than I have!`,
                `${cap(await theyHave(t.displayName))} been here literally forever.`,
            ])
        }

        chatClient.say(channel, intro + " " + followMsg + " " + conclusion);
    } else {
        const conclusion = rand([
            `I'm so glad ${await theyAre(t.displayName)} here.`,
            "That wouldn't be very welcoming."
        ])
        chatClient.say(channel, intro + " " + conclusion);
    }
}

module.exports = { command };
