function prefix_from(prefixes) {
    if (prefixes.length === 0) {
        return "";
    }
    if (Math.random() < 0.67) {
        return "";
    }
    const result = prefixes[Math.floor(Math.random() * prefixes.length)];
    return result + " " + prefix_from(prefixes.filter(x => x !== result));
}

function prefix() {
    return prefix_from([
        "reverse",
        "chained",
        "delayed",
        "grounded",
        "inverted",
        "extended",
    ]);
}

function tech() {
    const techs = [
        "autoscroller",
        "back",
        "Badeline",
        "bino",
        "bubble",
        "bubs",
        "bunny",
        "cassette",
        "ceiling",
        "corner",
        "Dama",
        "dash",
        "death",
        "demo",
        "door",
        "dream",
        "fast",
        "feather",
        "heart",
        "hyper",
        "ice",
        "jelly",
        "Kevin",
        "key",
        "multi",
        "neutral",
        "oil",
        "pause",
        "Theo",
        "spike",
        "spinner",
        "super",
        "ultra",
        "wall",
        "wave",
    ];
    const suffixes = [
        "boost",
        " boost",
        "bounce",
        " bubble",
        " buffer",
        "corner",
        " corner boost",
        " cycle",
        "dash",
        " dash",
        " dash jump",
        "drop",
        " drop",
        " fall",
        "glide",
        "hop",
        " hyper",
        "jump",
        " jump",
        "kick",
        " pop",
        " skip",
        " skip skip",
        " smuggle",
        " storage",
        " super",
        " ultra",
        " warp",
        "vator",
    ];
    const result = prefix() + " " + techs[Math.floor(Math.random() * techs.length)] + suffixes[Math.floor(Math.random() * suffixes.length)];
    if (Math.random() < 0.1) {
        return result + " into " + tech();
    }
    return result;
}

function command(chatClient, channel) {
    const message = tech();
    // If message starts with a vowel
    if (["a", "e", "i", "o", "u"].includes(message[0])) {
        chatClient.say(channel, `Simply do an ${message}`);
    } else {
        chatClient.say(channel, `Simply do a ${message}`);
    }
}

module.exports = { command };
