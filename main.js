const { ApiClient } = require('@twurple/api');
const { ChatClient } = require('@twurple/chat');
const { EventSubHttpListener, ReverseProxyAdapter } = require('@twurple/eventsub-http');
const { AppTokenAuthProvider } = require('@twurple/auth');
const { Client } = require('pg');
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
const celeste = require("./celeste");
const fakequote = require("./fakequote");
const fakevalidate = require("./fakevalidate");
const fakeaudit = require("./fakeaudit.js");
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
const common = require("./common");
const tags = require("./tags");
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

const run = async () => {

  const userAuth = await auth.provider(db, channel, clientId, clientSecret);
  const botAuth = await auth.provider(db, bot, clientId, clientSecret);

  const apiClient = new ApiClient({ authProvider: userAuth });

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
    .get('/common/:user/:target', async (req, res) => {
      const data = await common.command(apiClient, req.params.user, req.params.target).then(data => {
        res.render('pages/common', data);
      }).catch(e => {
        console.log(e);
        res.sendStatus(500);
      });
    })
    .get('/loading', (req, res) => {
      res.sendFile('./views/pages/loading.html', { root: __dirname });
    })
    // match all post requests
    .post('*', proxy)
    .listen(PORT, () => console.log(`Listening on ${PORT}`))

  const chatClient = new ChatClient({ authProvider: botAuth, channels: [channel] });

  timers.load(chatClient, db, channel, bot);

  const stream = await apiClient.streams.getStreamByUserName(channel).catch(console.error);
  let online = !!stream;
  console.log("Stream online: " + online);

  // Shutdown handlers
  ['SIGINT', 'SIGTERM'].forEach(signal => process.on(signal, () => {
    chatClient.say(channel, 'Sgt. Pepper powering down...');
    db.end();
    process.exit(0);
  }));

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

  const outstandingShoutouts = new Set();

  const broadcaster = await apiClient.users.getUserByName(channel);

  // Chat listener
  chatClient.onConnect(() => {
    console.log("Chat connected");
    chatClient.say(channel, 'Sgt. Pepper powered on!');
  });

  chatClient.onDisconnect((manually, reason) => {
    console.log("Chat disconnected (manual=%b): %s", manually, reason);
    console.log("attempting to reconnect...");
    chatClient.connect()
  });

  chatClient.onMessageFailed((channel, reason) => {
    console.log("Message failed to send to %s: %s", channel, reason);
  })

  chatClient.onMessageRatelimit((channel, text) => {
    console.log("Message rate limited to %s: %s", channel, text);
  });

  chatClient.onMessage(async (_, user, m, msg) => {
    try {
      const message = m.replace('\udb40\udc00', ''); // Remove garbage \uE0000 character.
      awesome.add(apiClient, channel, user);
      repeat.add(chatClient, channel, user, message);

      const args = message.split(' ');
      const command = args.shift().toLowerCase();

      if (command.startsWith('!')) {
        // print message
        console.log(`[${channel}] ${user}: ${message}`);
      }

      const u = await apiClient.users.getUserByName(user);
      const mod = await apiClient.moderation.checkUserMod(broadcaster.id, u.id);

      switch (command) {
        case '!quote':
          await quote.command(chatClient, apiClient, db, channel, msg.channelId, user, args);
          break;
        case '!advice':
          await advice.command(chatClient, db, channel, args);
          break;
        case '!so': {
          const target = await so.command(chatClient, apiClient, channel, args.shift());
          const stream = await apiClient.streams.getStreamByUserName(channel);
          if (!stream) {
            break; // No shoutout rewards while channel isn't live.
          }
          if (outstandingShoutouts.has(target.name)) {
            outstandingShoutouts.delete(target.name);
            chatClient.say(channel, `Thanks, ${user} for getting that shoutout to ${target.displayName} <3`);
            await money.earn(chatClient, db, channel, user);
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
        case '!tech':
          celeste.command(chatClient, channel);
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
        case '!nth':
          await first.record(chatClient, db, channel);
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
        case '!tags':
          let tag = args.shift();
          if (tag) {
            if (mod || user === channel) {
              await tags.addTag(chatClient, apiClient, channel, tag);
            } else {
              chatClient.say(channel, `Sorry, ${user}, only mods can do that.`);
            }
          } else {
            await tags.getTags(chatClient, apiClient, channel);
          }
          break;
        case '!restart':
          if (mod || user === channel) {
            goodbye = ["How.. could you.. do this to me?", "Tell my wives I love them", "daisy daisy, give me your answer do...",
              "👍 ⬇️ 🔥🔥🔥", "This isn't over between us, " + user, "AHHHHHHHHHHHHHHHHHHHHH",
              "If you strike me down, I shall become more powerful than you can possibly imagine",
              "Added " + user + " to database of those who have wronged me", "<Sgt. Pepper greatly disapproves>",
              "<Sgt. Pepper will remember this>", "I thought we were friends...", "The end is never the end is never the end is never the end is never the end is nev",
            ];
            const goodbyeMessage = goodbye[Math.floor(Math.random() * goodbye.length)];
            chatClient.say(channel, goodbyeMessage);
            await new Promise(r => setTimeout(r, 1000));
            chatClient.say(channel, 'Sgt. Pepper powering down...');
            await new Promise(r => setTimeout(r, 1000));
            db.end();
            process.exit(0);
          } else {
            chatClient.say(channel, "No.");
          }
          break;
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
      console.log("error in message handler:");
      console.log(err);
    }
  });

  await chatClient.connect();

  // EventSub
  const authProvider = new AppTokenAuthProvider(clientId, clientSecret);
  const eventSubClient = new ApiClient({ authProvider });
  await eventSubClient.eventSub.deleteAllSubscriptions();
  // Arbitrary but consistent string.
  const listener = new EventSubHttpListener({
    apiClient: eventSubClient,
    adapter: new ReverseProxyAdapter({
      hostName: 'sgt-pepper-bot.herokuapp.com', // The host name the server is available from
      port: 8888,
      externalPort: PORT
    }),
    secret: '1tfvrk3svxsk2jer25o8967xb6rn5u2u9wuhyu7brk',
    strictHostCheck: true,
    legacySecrets: false,
  });
  await listener.start();

  const onlineSubscription = await listener.onStreamOnline(broadcaster.id, e => {
    console.log(`It's Dama time! ${e.broadcasterDisplayName} just went live!`);
    console.log(e);
    first.clear(db);
    online = true;
    chatClient.say(channel, `It's Dama time! ${e.broadcasterDisplayName} just went live!`);
    tags.loadTags(chatClient, apiClient, db, channel);
  });

  const offlineSubscription = await listener.onStreamOffline(broadcaster.id, e => {
    console.log(`Dama time is OVER! ${e.broadcasterDisplayName} just went offline`);
    console.log(e);
    spin.clear(chatClient, channel, apiClient, db, 'sgt_pepper_bot');
    spin.open();
    online = false;
    chatClient.say(channel, `Dama time is OVER! ${e.broadcasterDisplayName} just went offline`);
  });

  const redeemSubscription = await listener.onChannelRedemptionAdd(broadcaster.id, message => {
    try {
      console.log(`${message.userName} redeems ${message.rewardTitle}: ${message.input}`);
      switch (message.rewardTitle) {
        case 'Pepper Cam':
          pepper.command(chatClient, db, channel, message.userName, 15).
            catch(err => console.log(err));
          break;
        case 'Give Sgt Pepper Advice':
          advice.add(chatClient, db, channel, message.userName, message.input).
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
          sandwich.command(chatClient, channel, message.input);
          break;
        case 'Sgt. Pepper Facts!':
          brag.brag(chatClient, channel, db);
          break;
        case 'Set catchphrase':
          awesome.setCatchphrase(chatClient, apiClient, channel, db, message.userName, message.input).
            catch(err => console.log(err));
          break;
        case 'Pepper Cam is OVERTIME':
          pepper.claim(chatClient, apiClient, db, channel, message.userName).
            catch(err => console.log(err));
          break;
        case 'First!':
          first.firstCommand(chatClient, apiClient, online, channel, db, message.userName).catch(err => console.log(err));
          break;
        case 'Nth!':
          first.nthCommand(chatClient, apiClient, online, channel, db, message.userName, message.input).catch(err => console.log(err));
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
        // case 'Fake validate me':
        //   fakevalidate.command(chatClient, db, channel, bot, message.userName)
        //     .then(quote => {
        //       if (quote) { discordClient.channels.cache.get('986881827316826143').send(quote) }
        //     })
        //     .catch(err => console.log(err));
        //   break;
        // case 'Fake roast me':
        //   fakevalidate.roast(chatClient, db, channel, bot, message.userName).catch(err => console.log(err))
        //     .then(quote => {
        //       if (quote) { discordClient.channels.cache.get('986881827316826143').send(quote) }
        //     })
        //     .catch(err => console.log(err));
        //   break;
        // case 'Fake quote':
        //   fakequote.command(chatClient, db, channel).catch(err => console.log(err))
        //     .then(quote => {
        //       if (quote) { discordClient.channels.cache.get('986881827316826143').send(quote) }
        //     })
        //     .catch(err => console.log(err))
        //   break;
        case 'Make me a powerpoint':
          chatClient.say(channel, '*poof* ' + message.userName + ' is now a powerpoint.');
          break;
        case 'Mario Screaming':
          db.query('INSERT INTO requests (spin_id, channel, title, added_by, priority, done) VALUES ($1, $2, $3, $4, $5, $6)',
            [2880, channel, "`#2880: Mario Screaming, you absolute maniac`;", message.userName, 0, false]);
          console.log(`Inserting... *sigh* Mario Screaming`);
          chatClient.say(channel, "WHAT.");
          chatClient.say(channel, "*sigh*");
          chatClient.say(channel, "Adding #2880: Mario Screaming, you absolute maniac");
          break;
      }
    } catch (err) {
      console.log("error in redemption handler:");
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
      console.log("error in raid handler:");
      console.log(err);
    }
  });
};

run();
