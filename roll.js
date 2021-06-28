async function command(chatClient, channel, args) {
    const regex = /^[dD]\d+$/g;
    if (args.length >= 1 && args[0].match(regex) ) {
       var dieSize = args[0].substring(1, args[0].length);
       const rollResult = 1 + Math.floor(Math.random() * dieSize);
       chatClient.say(channel, args[0] + " = " + rollResult);
    }
   
    const peppergex = /^[pP]\d+$/g;
    const dieSizeLimit = 10;
    if (args.length >= 1 && args[0].match(peppergex) ) {
       var dieSize = args[0].substring(1, args[0].length);
       if (dieSize > dieSizeLimit) {
         chatClient.say(channel, "More than " + dieSizeLimit + " would get too spammy!");
         return;
       }
       const rollResult = 1 + Math.floor(Math.random() * dieSize);
       chatClient.say(channel, "damaplEpper ".repeat(rollResult));
    }
}

module.exports = { command };
