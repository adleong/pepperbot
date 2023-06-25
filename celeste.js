function prefix() {
    if (Math.random() < 0.67) {
        return "";
    }
    const prefixes = [
        "reverse",
        "chained",
        "delayed",
        "grounded",
        "inverted",
        "extended",
    ];
    return prefixes[Math.floor(Math.random() * prefixes.length)] + " " + prefix();
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
    } else {
        return result;
    }
}

function command(chatClient, channel) {
    let message = tech();
    // if message starts with a vowel
    if (["a", "e", "i", "o", "u"].includes(message[0])) {
        chatClient.say(channel, `Simply do an ${message}`);
    } else {
        chatClient.say(channel, `Simply do a ${message}`);
    }
}

module.exports = { command };
