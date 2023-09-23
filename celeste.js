const { aOrAn } = require("./helpers/aOrAn");

function prefix_from(prefixes) {
    if (prefixes.length === 0) {
        return "";
    }
    if (Math.random() < 0.67) {
        return "";
    }
    const result = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = prefix_from(prefixes.filter(x => x !== result));
    if (suffix === "") {
        return result;
    } else {
        return result + " " + suffix;
    }
}

function prefix() {
    return prefix_from([
        "reverse",
        "chained",
        "delayed",
        "failed",
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
        "block",
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
        "fish",
        "heart",
        "hyper",
        "ice",
        "jelly",
        "Kevin",
        "key",
        "Lexi",
        "multi",
        "neutral",
        "oil",
        "pause",
        "Theo",
        "spike",
        "spinner",
        "spring",
        "super",
        "ultra",
        "wall",
        "wave",
        "wind",
    ];
    const suffixes = [
        "boost",
        " boost",
        "bounce",
        " bubble",
        " buffer",
        " cancel",
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
        " ladder",
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
    let p = prefix();
    if (p !== "") {
        p = p + " ";
    }
    const result = p + techs[Math.floor(Math.random() * techs.length)] + suffixes[Math.floor(Math.random() * suffixes.length)];
    if (Math.random() < 0.1) {
        return result + " into " + tech();
    }
    return result;
}

function command(chatClient, channel) {
    const message = tech();
    chatClient.say(channel, `Simply do ${aOrAn(message)} ${message}`);
}

module.exports = { command };
