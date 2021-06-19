const { ApiClient } = require('twitch');
const { StaticAuthProvider } = require('twitch-auth');
const { ChatClient } = require('twitch-chat-client');
const { Client } = require('pg');

const quote = require("./quote");
const timers = require("./timers");
const so = require("./so");
const advice = require("./advice");

const clientId = process.env.CLIENT_ID;
const accessToken = process.env.ACCESS_TOKEN;
const authProvider = new StaticAuthProvider(clientId, accessToken);

const channel = process.env.CHANNEL;

const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

db.connect();
console.log("Database connected");

const run = async () => {

  const apiClient = new ApiClient({ authProvider });
  const chatClient = new ChatClient(authProvider, { channels: [channel] });
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
  chatClient.onMessage(async (channel, user, message, msg) => {
    try {
      chatters[user] = new Date(Date.now());

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
          await so.command(apiClient, chatClient, channel, args.shift());
          break;
        case '!chatters':
          for (const chatter in chatters) {
            chatClient.say(channel, chatter + ' last spoke at ' + chatters[chatter].toString());
          }
          break;
      }
    } catch(err) {
      console.log(err);
    }
  });
};



run();