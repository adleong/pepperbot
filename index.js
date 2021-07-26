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
const lurk = require("./lurk");
const pepper = require("./pepper");
const roll = require("./roll");
const brag = require("./brag");
const sandwich = require("./sandwich");

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const channel = process.env.CHANNEL;
const bot = process.env.NAME

const ssl = process.env.DATABASE_URL.startsWith('postgres://localhost')
  ? false
  : { rejectUnauthorized: false }
const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl
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

  const outstandingShoutouts = new Set();

  // Chat listener
  chatClient.onMessage(async (_, user, message, msg) => {
    try {
      awesome.add(apiClient, user);

      const args = message.split(' ');
      const command = args.shift().toLowerCase();

      switch (command) {
        case '!quote':
          await quote.command(chatClient, apiClient, db, channel, msg.channelId, user, args);
          break;
        case '!advice':
          await advice.command(chatClient, db, channel, args);
          break;
        case '!so': {
          const target = await so.command(chatClient, apiClient, channel, args.shift());
          if (outstandingShoutouts.has(target.name)) {
            outstandingShoutouts.delete(target.name);
            chatClient.say(channel, `Thanks, ${user} for getting that shoutout to ${target.displayName} <3`);
          }
          break;
        }
        case '!game':
          await game.command(chatClient, apiClient, channel, user, args);
          break;
        case '!title':
          await title.command(chatClient, apiClient, channel, user, args);
          break;
        case '!awesome':
          await awesome.command(chatClient, channel, db);
          break;
        case '!lurk':
          lurk.lurk(chatClient, channel, user, args);
          break;
        case '!unlurk':
          lurk.unlurk(chatClient, channel, user);
          break;
        case '!roll':
          roll.command(chatClient, channel, args);
          break;
        case '!pepper':
          chatClient.say(channel, 'Hello, everyone! Please allow me to introduce myself: I am Sgt Pepper Bot MkII and I am at your service.  Use !commands to see what I can do!');
          break;
        case '!leaders':
          await pepper.leaders(chatClient, db, channel);
          break;
        case '!commands':
          chatClient.say(channel, ['!quote', '!advice', '!so', '!game', '!title', '!awesome', '!lurk', '!unlurk', '!roll', '!leaders', '!pepper', '!commands'].join(' '));
          break;
        default: {
          if (command.startsWith('!')) {
            await timers.command(chatClient, db, channel, command);
          }
        }

          /*
        // DEBUG COMMANDS
        case '!grind':
          pepper.command(chatClient, db, channel, user, 15);
          break;
        case '!brag':
          brag.brag(chatClient, channel, db);
          break;
          */

      }
    } catch(err) {
      console.log(err);
    }
  });

  // Events listener.
  const pubSubClient = new PubSubClient();
  const userId = await pubSubClient.registerUserListener(apiClient);
  await pubSubClient.onRedemption(userId, message => {
    try {
      console.log(`${message.userName} redeems ${message.rewardName}`);
      console.log(message.message);
      switch (message.rewardName) {
        case 'Pepper Cam':
          pepper.command(chatClient, db, channel, message.userName, 15).
            catch(err => console.log(err));
          break;
        case 'Give Sgt Pepper Advice':
          advice.add(chatClient, db, channel, message.userName, message.message).
            catch(err => console.log(err));
          break;
        case 'Brag Time': {
          const seconds = 1000;
          const minutes = 60 * seconds;
          const delay = Math.floor(Math.random() * 5 * minutes);
          setTimeout(function() {
            brag.brag(chatClient, channel, db);
          }, delay);
          break;
        }
        case 'Ask Sgt. Pepper: Is it a sandwich?':
          sandwich.command(chatClient, channel, message.message);
          break;
        case 'Sgt. Pepper Facts!':
          brag.brag(chatClient, channel, db);
          break;
        case 'Set catchphrase':
          awesome.setCatchphrase(chatClient, apiClient, channel, db, message.userName, message.message).
            catch(err => console.log(err));
          break;
      }
    } catch(err) {
      console.log(err);
    }
  });

  chatClient.onRaid(async (_, user, raidInfo, _msg) => {
    try {
      chatClient.say(channel, `Welcome raiders! Thank you for the raid, ${raidInfo.displayName}!`);
      chatClient.say(channel, `Can we get a shoutout for ${raidInfo.displayName}, please?`);
      outstandingShoutouts.add(user);
      // In 2 minutes, trigger a shoutout.
      setTimeout(() => {
        if (outstandingShoutouts.has(user)) {
          outstandingShoutouts.delete(user);
          chatClient.say(channel, 'Fine, I\'ll do it myself!');
          so.command(chatClient, apiClient, channel, user);
        }
      }, 2 * 60 * 1000);
    } catch(err) {
      console.log(err);
    }
  });
};

run();