const { ApiClient } = require('twitch');
const { ChatClient } = require('twitch-chat-client');
const { Client } = require('pg');
const { PubSubClient } = require('twitch-pubsub-client');
const express = require('express')
const path = require('path')

const advice = require("./advice");
const auth = require("./auth");
const awesome = require("./awesome");
const brag = require("./brag");
const game = require("./game");
const lurk = require("./lurk");
const pepper = require("./pepper");
const quote = require("./quote");
const repeat = require("./repeat");
const roll = require("./roll");
const sandwich = require("./sandwich");
const so = require("./so");
const spin = require("./spin");
const timers = require("./timers");
const title = require("./title");

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const bot = process.env.NAME
const PORT = process.env.PORT || 5000
const channels = process.env.CHANNELS.split(',');

const ssl = process.env.DATABASE_URL.startsWith('postgres://localhost')
  ? false
  : { rejectUnauthorized: false }
const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl
});

db.connect(); 
console.log("Database connected");

express()
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .listen(PORT, () => console.log(`Listening on ${PORT}`))

const run = async () => {

  const botAuth = await auth.provider(db, bot, clientId, clientSecret);

  const apiClients = {};
  const chatClients = {};
  for (const channel of channels) {
    const userAuth = await auth.provider(db, channel, clientId, clientSecret);
    apiClients[channel] = new ApiClient({ authProvider: userAuth });

    const chatClient = new ChatClient(botAuth, { channels: [channel] });
    chatClients[channel] = chatClient
    await chatClient.connect()
    console.log(`Chat connected to ${channel}`);

    timers.load(chatClient, db, channel);

    // On startup
    chatClient.onRegister(async () => {
        chatClient.say(channel, 'Sgt. Pepper powered on!');
    });
  }

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
      repeat.add(chatClient, channel, user, message);

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
            await so.increment(db, user);
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
        case '!commands':
          chatClient.say(channel, ['!quote', '!advice', '!so', '!game', '!title', '!awesome', '!lurk', '!unlurk', '!roll', '!leaders', '!pepper', '!commands'].join(' '));
          break;
        default: {
          if (command.startsWith('!')) {
            await timers.command(chatClient, db, channel, command);
          }
        }
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