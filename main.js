const { ApiClient } = require('twitch');
const { ChatClient } = require('twitch-chat-client');
const { EventSubListener, ReverseProxyAdapter } = require('twitch-eventsub');
const { ClientCredentialsAuthProvider } = require('twitch-auth');
const { Client } = require('pg');
const { PubSubClient } = require('twitch-pubsub-client');
const express = require('express')
const path = require('path')
const Discord = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { createProxyMiddleware } = require('http-proxy-middleware');

const advice = require("./advice");
const auth = require("./auth");
const awesome = require("./awesome");
const brag = require("./brag");
const fakequote = require("./fakequote");
const fakevalidate = require("./fakevalidate");
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
const quiz = require("./quiz");
const money = require("./money");
const ban = require("./ban");
const first = require("./first");
const wotd = require("./wotd");
const say = require("./say");
const pronouns = require("./pronouns");
const { env } = require('process');

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const channel = process.env.CHANNEL;
const bot = process.env.NAME
const PORT = process.env.PORT || 5000

const ssl = process.env.DATABASE_URL.startsWith('postgres://localhost')
  ? false
  : { rejectUnauthorized: false }
const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl
});

db.connect();
console.log("Database connected");

const options = {
  target: 'http://localhost:8888/', // target host with the same base path
};

// create the proxy
const proxy = createProxyMiddleware({ target: 'http://localhost:8888', changeOrigin: true });

express()
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/carousel', async (req, res) => {
    res.render('pages/carousel', {})
  })
  .get('/quote', async (req, res) => {
    const q = await quote.quote(db, channel);
    res.render('pages/quote', { 'quote': q })
  })
  .get('/leaders', async (req, res) => {
    const results = await pepper.leadersResults(db);
    res.render('pages/leaders', { results })
  })
  .get('/reclaimers', async (req, res) => {
    const results = await pepper.claimedLeaders(db);
    res.render('pages/claimed', { results })
  })
  .get('/money', async (req, res) => {
    const results = await money.leaders(db);
    res.render('pages/money', { results })
  })
  .get('/queue', async (req, res) => {
    const queue = await spin.queue(channel, db);
    res.render('pages/queue', { 'results': queue })
  })
  .get('/timer', async (req, res) => {
    res.render('pages/timer')
  })
  .get('/timer/start', async (req, res) => {
    pepper.start();
    res.sendStatus(200);
  })
  .get('/timer/stop', async (req, res) => {
    pepper.stop();
    res.sendStatus(200);
  })
  .get('/timer/ping', async (req, res) => {
    const claimant = await pepper.ping(req.query.secs);
    res.setHeader('Content-Type', 'application/json');
    res.write(JSON.stringify(claimant));
    res.end();
  })
  .get('/say', async (req, res) => {
    res.render('pages/say', {})
  })
  .get('/say.json', async (req, res) => {
    say.listen(res);
  })
  // match all post requests
  .post('*', proxy)
  .listen(PORT, () => console.log(`Listening on ${PORT}`))

const run = async () => {

  const userAuth = await auth.provider(db, channel, clientId, clientSecret);
  const botAuth = await auth.provider(db, bot, clientId, clientSecret);

  const apiClient = new ApiClient({ authProvider: userAuth });
  const chatClient = new ChatClient(botAuth, { channels: [channel] });
  await chatClient.connect();
  console.log("Chat connected");

  timers.load(chatClient, db, channel, bot);

  const stream = await apiClient.helix.streams.getStreamByUserName(channel);
  let online = !!stream;
  console.log("Stream online: " + online);

  // On startup
  chatClient.onRegister(async () => {
    const stream = await apiClient.helix.streams.getStreamByUserName(channel);
    chatClient.say(channel, 'Sgt. Pepper powered on!');
  });

  // Shutdown handlers
  ['SIGINT', 'SIGTERM'].forEach(signal => process.on(signal, () => {
    chatClient.say(channel, 'Sgt. Pepper powering down...');
    db.end();
    process.exit(0);
  }));

  const outstandingShoutouts = new Set();

  const broadcaster = await apiClient.helix.users.getUserByName(channel);

  // Chat listener
  chatClient.onMessage(async (_, user, message, msg) => {
    try {
      awesome.add(apiClient, channel, user);
      repeat.add(chatClient, channel, user, message);

      const args = message.split(' ');
      const command = args.shift().toLowerCase();

      const u = await apiClient.helix.users.getUserByName(user);
      const mod = await apiClient.helix.moderation.checkUserMod(broadcaster.id, u.id);

      switch (command) {
        case '!quote':
          await quote.command(chatClient, apiClient, db, channel, msg.channelId, user, args);
          break;
        case '!advice':
          await advice.command(chatClient, db, channel, args);
          break;
        case '!so': {
          const target = await so.command(chatClient, apiClient, channel, args.shift());
          const stream = await apiClient.helix.streams.getStreamByUserName(channel);
          if (!stream) {
            break; // No shoutout rewards while channel isn't live.
          }
          if (outstandingShoutouts.has(target.name)) {
            outstandingShoutouts.delete(target.name);
            chatClient.say(channel, `Thanks, ${user} for getting that shoutout to ${target.displayName} <3`);
            await money.earn(chatClient, db, channel, user);
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
          await awesome.command(chatClient, channel, bot, db);
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
          chatClient.say(channel, 'Hello, everyone! Please allow me to introduce myself: I am Sgt Pepper Bot MkII and I am at your service.  Use !commands to see what I can do! https://github.com/adleong/pepperbot');
          break;
        case '!leaders':
          const leaders = await money.leaders(db);
          chatClient.say(channel, `The pepper leaders are: ${leaders.map(l => `${l.name} (${l.money})`).join(', ')}`);
          break;
        case '!request':
          await spin.request(chatClient, channel, db, user, args);
          break;
        // case '!requestas':
        //   const as = args.shift();
        //   await spin.request(chatClient, channel, db, as, args);
        //   break;
        case '!done':
          await spin.done(chatClient, channel, apiClient, db, user, args.shift());
          break;
        case '!clear':
          await spin.clear(chatClient, channel, apiClient, db, user);
          break;
        case '!open':
          if (mod || user === channel) {
            spin.open();
            chatClient.say(channel, 'The queue is now open!');
          } else {
            chatClient.say(channel, `Sorry, ${user}, only mods can do that.`);
          }
          break;
        case '!close':
          if (mod || user === channel) {
            spin.close();
            chatClient.say(channel, 'The queue is now closed!');
          } else {
            chatClient.say(channel, `Sorry, ${user}, only mods can do that.`);
          }
          break;
        case '!sandwich':
          sandwich.command(chatClient, channel, args.join(' '));
          break;
        case '!addcommand':
          if (mod || user === channel) {
            await timers.addCommand(chatClient, db, channel, args.shift(), args.join(' '));
          } else {
            chatClient.say(channel, `Sorry, ${user}, only mods can do that.`);
          }
          break;
        case '!addtimer':
          if (mod || user === channel) {
            const command = args.shift();
            const time = args.shift();
            await timers.addTimer(chatClient, db, channel, bot, command, args.join(' '), time);
          } else {
            chatClient.say(channel, `Sorry, ${user}, only mods can do that.`);
          }
          break;
        case '!remove':
          if (mod || user === channel) {
            await timers.remove(chatClient, db, channel, args.shift());
          } else {
            chatClient.say(channel, `Sorry, ${user}, only mods can do that.`);
          }
          break;
        case '!quiz':
          if (mod || user === channel) {
            await quiz.command(chatClient, apiClient, channel, db);
          } else {
            chatClient.say(channel, `Sorry, ${user}, only mods can do that.`);
          }
          break;
        case '!answer':
          quiz.answer(user, args.join(' '));
          break;
        case '!money':
          await money.report(chatClient, db, channel, user);
          break;
        case '!ban':
          await ban.command(chatClient, apiClient, channel, bot, user, args.join(' '));
          break;
        case '!pronouns':
          let target = args.shift();
          if (!target) {
            target = user;
          }
          await pronouns.pronouns(chatClient, channel, target);
          break;
        case '!fakequote':
          await fakequote.command(chatClient, channel);
          break;
        // case '!fakevalidate':
        //   const t = args.shift();
        //   await fakevalidate.command(chatClient, channel, t ? t : user);
        //   break;
        case '!say':
          if (mod || user === channel) {
            say.say(args.join(' '));
          } else {
            chatClient.say(channel, `Sorry, ${user}, only mods can do that.`);
          }
          break;
        // case '!nth':
        //   const nthT = args.shift();
        //   const n = args.shift();
        //   await first.nthCommand(chatClient, apiClient, online, channel, db, nthT, n);
        //   break;
        // case '!first':
        //   const firstT = args.shift();
        //   await first.firstCommand(chatClient, apiClient, online, channel, db, firstT);
        //   break;
        case '!commands':
          let commands = ['!advice', '!game', '!title', '!awesome', '!lurk', '!unlurk', '!roll', '!pepper', '!leaders', '!request',
            '!done', '!clear', '!sandwich', '!addcommand', '!addtimer', '!remove'];
          const extra = await timers.getCommands(db, channel);
          commands = commands.concat(extra);
          chatClient.say(channel, 'My commands are: ' + commands.join(' '));
          break;
        default: {
          if (command.startsWith('!')) {
            await timers.command(chatClient, db, channel, command);
          }
        }
      }
    } catch (err) {
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
          setTimeout(function () {
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
        case 'Pepper Cam is OVERTIME':
          pepper.claim(chatClient, apiClient, db, channel, message.userName).
            catch(err => console.log(err));
          break;
        case 'First!':
          first.firstCommand(chatClient, apiClient, online, channel, db, message.userName);
          break;
        case 'Nth!':
          first.nthCommand(chatClient, apiClient, online, channel, db, message.userName, message.message);
          break;
        case 'Random word':
          wotd.command(chatClient, channel).catch(err => console.log(err));
          break;
        case 'TTS Fake Quote':
          fakequote.fake().then(quote => {
            say.say(quote);
            chatClient.say(channel, quote);
          });
          break;
        case 'Fake validate me':
          fakevalidate.command(chatClient, channel, message.userName).catch(err => console.log(err));
          break;
      }
    } catch (err) {
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
    } catch (err) {
      console.log(err);
    }
  });

  // EventSub
  const authProvider = new ClientCredentialsAuthProvider(clientId, clientSecret);
  const eventSubClient = new ApiClient({ authProvider });
  // Arbitrary but consistent string.
  const listener = new EventSubListener(eventSubClient, new ReverseProxyAdapter({
    hostName: 'sgt-pepper-bot.herokuapp.com', // The host name the server is available from
    port: 8888,
    externalPort: PORT
  }), '1tfvrk3svxsk2jer25o8967xb6rn5u2u9wuhyu7brk');
  await listener.listen();

  const onlineSubscription = await listener.subscribeToStreamOnlineEvents(broadcaster.id, e => {
    console.log(`It's Dama time! ${e.broadcasterDisplayName} just went live!`);
    console.log(e);
    first.clear(db);
    online = true;
    chatClient.say(channel, `It's Dama time! ${e.broadcasterDisplayName} just went live!`);
  });

  const offlineSubscription = await listener.subscribeToStreamOfflineEvents(broadcaster.id, e => {
    console.log(`Dama time is OVER! ${e.broadcasterDisplayName} just went offline`);
    console.log(e);
    spin.clear(chatClient, channel, apiClient, db, 'sgt_pepper_bot');
    spin.open();
    online = false;
    chatClient.say(channel, `Dama time is OVER! ${e.broadcasterDisplayName} just went offline`);

  });

  // Discord
  const token = env.DISCORD_TOKEN;
  const guildId = env.GUILD_ID;
  const discordClientId = env.DISCORD_CLIENT_ID;

  const discordClient = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS] });
  discordClient.on('ready', () => {
    console.log('Discord client ready.');
    console.log('Initializing slash commands...');

    const commands = [
      new SlashCommandBuilder()
        .setName('quote')
        .setDescription('Fetch a quote')
        .addStringOption(option =>
          option.setName('query')
            .setDescription('Quote id or search query')),
      new SlashCommandBuilder()
        .setName('fakequote')
        .setDescription('Generate a fake quote'),
      new SlashCommandBuilder()
        .setName('advice')
        .setDescription('Get some advice')
        .addStringOption(option =>
          option.setName('query')
            .setDescription('search query')),
    ].map(command => command.toJSON());

    console.log(commands);

    const rest = new REST({ version: '9' }).setToken(token);

    rest.put(Routes.applicationGuildCommands(discordClientId, guildId), { body: commands })
      .then(() => console.log('Successfully registered application commands.'))
      .catch(console.error);

  });

  discordClient.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'quote') {
      const query = interaction.options.getString('query');
      const args = [];
      if (query) {
        args.push(query);
      }
      const result = await quote.lookup(db, channel, interaction.user.toString(), args);
      await interaction.reply(result);
    } else if (commandName === 'fakequote') {
      await interaction.deferReply();
      const result = await fakequote.fake();
      await interaction.editReply(result);
    } else if (commandName === 'advice') {
      const query = interaction.options.getString('query');
      const args = [];
      if (query) {
        args.push(query);
      }
      const result = await advice.lookup(db, channel, args);
      await interaction.reply(result);
    }
  });

  discordClient.login(token);

};

run();
