const { OpenAI } = require("openai");
const openai = new OpenAI(process.env.OPENAI_API_KEY);
const url = /(\w+:\/\/)?\w+\.[a-zA-Z0-9][a-zA-Z0-9\/\?\%\#\&_=\-\.]*/g;
const period = /\.\W*/g;

async function audit(quote, db) {
    // Replace all links in quote with [hyperlink blocked]
    quote = quote.replaceAll(period, ". ");
    quote = quote.replaceAll(url, "[hyperlink blocked]");

    const response = await openai.moderations.create({
        input: quote,
    });
    const result = response.results[0];
    console.log(result);
    await db.query('INSERT INTO fake_audit (message, ' +
        'sexual_score, sexual_flagged, ' +
        'hate_score, hate_flagged, ' +
        'harassment_score, harassment_flagged, ' +
        'self_harm_score, self_harm_flagged, ' +
        'sexual_minors_score, sexual_minors_flagged, ' +
        'hate_threatening_score, hate_threatening_flagged, ' +
        'violence_graphic_score, violence_graphic_flagged, ' +
        'self_harm_intent_score, self_harm_intent_flagged, ' +
        'self_harm_instructions_score, self_harm_instructions_flagged, ' +
        'harassment_threatening_score, harassment_threatening_flagged, ' +
        'violence_score, violence_flagged' +
        ') VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)',
        [quote,
            result.category_scores["sexual"], result.categories["sexual"],
            result.category_scores["hate"], result.categories["hate"],
            result.category_scores["harassment"], result.categories["harassment"],
            result.category_scores["self-harm"], result.categories["self-harm"],
            result.category_scores["sexual/minors"], result.categories["sexual/minors"],
            result.category_scores["hate/threatening"], result.categories["hate/threatening"],
            result.category_scores["violence/graphic"], result.categories["violence/graphic"],
            result.category_scores["self-harm/intent"], result.categories["self-harm/intent"],
            result.category_scores["self-harm/instructions"], result.categories["self-harm/instructions"],
            result.category_scores["harassment/threatening"], result.categories["harassment/threatening"],
            result.category_scores["violence"], result.categories["violence"]]);
    if (result.flagged) {
        console.log("Rejecting unsafe validation: " + quote);
        console.log(result);
        return null;
    } else {
        const categories = ["sexual", "hate", "harassment", "self-harm", "sexual/minors", "hate/threatening", "violence/graphic", "self-harm/intent", "self-harm/instructions", "harassment/threatening", "violence"];
        for (const category of categories) {
            if (result.category_scores[category] > 0.4) {
                console.log("Flagged for " + category + " (" + result.category_scores[category] + "): " + quote);
                return null;
            }
        }
        return quote;
    }
}

module.exports = {
    audit
};
