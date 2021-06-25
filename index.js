const { ApiClient } = require('twitch');
const { ChatClient } = require('twitch-chat-client');
const { PubSubClient } = require('twitch-pubsub-client');
const { Client } = require('pg');

const auth = require("./auth");
const quote = require("./quote");
const timers = require("./timers");
const so = require("./so");
const advice = require("./advice");
const game = require("./game");
const title = require("./title");
const awesome = require("./awesome");

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const channel = process.env.CHANNEL;
const bot = process.env.NAME

const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

db.connect();
console.log("Database connected");

const run = async () => {

  const userAuth = await auth.provider(db, channel, clientId, clientSecret);
  const botAuth = await auth.provider(db, bot, clientId, clientSecret);

  const apiClient = new ApiClient({ authProvider: userAuth });
  const chatClient = new ChatClient(botAuth, { channels: [channel] });
  await chatClient.connect();
  console.log("Chat connected");

  timers.load(chatClient, db, channel);

  // On startup
  chatClient.onRegister(async () => {
    chatClient.say(channel, 'Sgt. Pepper powered on!');
  });

  // Shutdown handlers
  ['SIGINT', 'SIGTERM'].forEach(signal => process.on(signal, () => {
    chatClient.say(channel, 'Sgt. Pepper powering down...');
    db.end();
    process.exit(0);
  }));

  var chatters = {};

  // Chat listener
  chatClient.onMessage(async (_, user, message, msg) => {
    try {
      awesome.add(user);

      const args = message.split(' ');
      const command = args.shift().toLowerCase();

      switch (command) {
        case '!test': 
          chatClient.say(channel, 'Your sound card works perfectly');
          break;
        case '!quote':
          await quote.command(chatClient, apiClient, db, channel, msg.channelId, user, args);
          break;
        case '!advice':
          await advice.command(chatClient, db, channel, args);
          break;
        case '!so':
          await so.command(chatClient, apiClient, channel, args.shift());
          break;
        case '!game':
          await game.command(chatClient, apiClient, channel, user, args);
          break;
        case '!title':
          await title.command(chatClient, apiClient, channel, user, args);
          break;
        case '!chatters':
          awesome.dumpChatters(chatClient, channel);
          break;
        case '!awesome':
          awesome.command(chatClient, channel);
          break;
      }
    } catch(err) {
      console.log(err);
    }
  });

  // Events listener.
  const pubSubClient = new PubSubClient();
  const userId = await pubSubClient.registerUserListener(apiClient);
  await pubSubClient.onRedemption(userId, (message) => {
    try {
      console.log(`${message.userName} redeems ${message.rewardName}`);
      console.log(message.message);
      switch (message.rewardName) {
        case 'Pepper Cam':
          break;
        case 'Give Sgt Pepper Advice':
          advice.add(chatClient, db, channel, message.userName, message.message)
            .catch(err => console.log(err));
          break;
      }
    } catch(err) {
      console.log(err);
    }
  });
};

run();