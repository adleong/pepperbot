const { ApiClient } = require('twitch');
const { ChatClient } = require('twitch-chat-client');
const { Client } = require('pg');
const express = require('express')
const path = require('path')

const advice = require("./advice");
const auth = require("./auth");
const awesome = require("./awesome");
const game = require("./game");
const lurk = require("./lurk");
const quote = require("./quote");
const repeat = require("./repeat");
const roll = require("./roll");
const so = require("./so");
const timers = require("./timers");
const title = require("./title");

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const bot = "mini_vanilla_bot"
const PORT = process.env.PORT || 5001
const channels = process.env.CHANNELS.split(',');
const admins = process.env.ADMINS.split(',')

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
  .get('/mini', async (req, res) => {
    res.render('pages/mini', {})
  })
  .listen(PORT, () => console.log(`Listening on ${PORT}`))

const run = async () => {

  const botAuth = await auth.provider(db, bot, clientId, clientSecret);
  const apiClient = new ApiClient({ authProvider: botAuth });
  const chatClient = new ChatClient(botAuth, { channels });
  await chatClient.connect()
  for (const channel of channels) {
    console.log(`Chat connected to ${channel}`);

    timers.load(chatClient, db, channel, "mini_vanilla_bot");

    // On startup
    chatClient.onRegister(async () => {
        chatClient.say(channel, 'Mini Vanilla powered on!');
    });
  }

  // Shutdown handlers
  ['SIGINT', 'SIGTERM'].forEach(signal => process.on(signal, () => {
    for (const channel of channels) {    
        chatClient.say(channel, 'Mini Vanilla powering down...');
    }
    db.end();
    process.exit(0);
  }));

  const outstandingShoutouts = new Set();

  // Chat listener
  chatClient.onMessage(async (chan, user, message, msg) => {
    try {
      const channel = chan.substring(1);
      awesome.add(apiClient, channel, user);
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
          await awesome.command(chatClient, channel, "mini_vanilla_bot", db);
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
        case '!mini':
          chatClient.say(channel, "Hello, everyone! Please allow me to introduce myself: I am Mini Vanilla Bot, Sgt Pepper Bot's little sister. I am mini, but mighty! https://github.com/adleong/pepperbot");
          break;
        case '!addcommand':
          if (user === channel || admins.includes(user)) {
            await timers.addCommand(chatClient, db, channel, args.shift(), args.join(' '));
          } else {
            chatClient.say(channel, `Sorry, ${user}, only ${channel} can do that.`);
          }
          break;
        case '!addtimer':
          if (user === channel || admins.includes(user)) {
            const command = args.shift();
            const time = args.shift();
            await timers.addTimer(chatClient, db, channel, command, args.join(' '), time);
          } else {
            chatClient.say(channel, `Sorry, ${user}, only ${channel} can do that.`);
          }
          break;
        case '!remove':
          if (user === channel || admins.includes(user)) {
            await timers.remove(chatClient, db, channel, args.shift());
          } else {
            chatClient.say(channel, `Sorry, ${user}, only ${channel} can do that.`);
          }
          break;
        case '!commands':
          let commands = ['!advice', '!game', '!title', '!awesome', '!lurk','!unlurk', '!roll',
            '!mini', '!addcommand', '!addtimer', '!remove'];
          const extra = await timers.getCommands(db, channel);
          commands = commands.concat(extra);
          chatClient.say(channel, 'My commands are: ' + commands.join(' '));
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

  chatClient.onRaid(async (chan, user, raidInfo, _msg) => {
    const channel = chan.substring(1);
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