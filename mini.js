const { ApiClient } = require('@twurple/api');
const { ChatClient } = require('@twurple/chat');
const { getTokenInfo, exchangeCode } = require('@twurple/auth');
const { Client } = require('pg');
const express = require('express')
const path = require('path')
const repeat = require('./repeat');
const auth = require('./auth');
const spin = require('./minispin');
const dashboard = require('./minidashboard');

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const bot = "mini_vanilla_bot"
const PORT = process.env.PORT || 5001
const HOST = process.env.HOST || 'http://localhost:5001'

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

  const botAuth = await auth.provider(db, bot, clientId, clientSecret);

  const { rows } = await db.query('SELECT channel FROM mini_vanilla');
  let channels = rows.map(row => row.channel);

  const chatClient = new ChatClient({authProvider: botAuth, channels });
  const apiClient = new ApiClient({ authProvider: botAuth });

  // Shutdown handlers
  ['SIGINT', 'SIGTERM'].forEach(signal => process.on(signal, () => {
    for (const channel of channels) {    
        chatClient.say(channel, 'Mini Vanilla powering down...');
    }
    db.end();
    process.exit(0);
  }));

  express()
    .set('views', path.join(__dirname, 'views'))
    .set('view engine', 'ejs')
    .get('/', async (req, res) => {
      res.render('pages/mini/index', { 
        add_params: `client_id=${clientId}&redirect_uri=${HOST}/add&response_type=code&scope=`,
        remove_params: `client_id=${clientId}&redirect_uri=${HOST}/remove&response_type=code&scope=`, 
      })
    })
    .get('/add', async (req, res) => {
      const code = req.query.code;
      // Get an access token and use it to instantiate an ApiClient.
      const token = await exchangeCode(clientId, clientSecret, code, `${HOST}/add`);
      const tokenInfo = await getTokenInfo(token.accessToken, clientId);
      const channel = tokenInfo.userName;
      const channels = await db.query('SELECT channel FROM mini_vanilla WHERE channel = $1', [channel]);
      if (channels.rows.length > 0) {
        res.render('pages/mini/add', { channel, error: 'Channel already added' })
      } else {
        await db.query('INSERT INTO mini_vanilla (channel) VALUES ($1)', [channel]);
        chatClient.join(channel).then(() => {
          chatClient.say(channel, 'Mini Vanilla reporting for duty!');
        });
        res.render('pages/mini/add', { channel, error: null })
      }
  })
  .get('/remove', async (req, res) => {
    const code = req.query.code;
    // Get an access token and use it to instantiate an ApiClient.
    const token = await exchangeCode(clientId, clientSecret, code, `${HOST}/remove`);
    const tokenInfo = await getTokenInfo(token.accessToken, clientId);
    const channel = tokenInfo.userName;
    const channels = await db.query('SELECT channel FROM mini_vanilla WHERE channel = $1', [channel]);
    if (channels.rows.length > 0) {
      await db.query('DELETE FROM mini_vanilla WHERE channel = $1', [channel]);
      chatClient.say(channel, 'Ok byeeeeeeeeeeee');
      chatClient.part(channel);
      res.render('pages/mini/remove', { channel, error: null })
    } else {
      res.render('pages/mini/remove', { channel, error: 'Channel not joined' })
    }
  })
  .get('/queue/:channel', async (req, res) => {
    const channel = req.params.channel;
    const queue = await spin.queue(channel, db);
    res.render('pages/queue', { 'results': queue })
  })
  .get('/dashboard', async (req, res) => {
    const results = await dashboard.dashboard(apiClient, db);
    res.render('pages/mini/dashboard', { results: results })
  })
  .listen(PORT, () => console.log(`Listening on ${PORT}`))

  chatClient.onMessage(async (chan, user, message, msg) => {
    try {
      const channel = chan.substring(1);
      repeat.add(chatClient, channel, user, message);

      const args = message.split(' ');
      const command = args.shift().toLowerCase();

      const mod = msg.userInfo.isMod || msg.userInfo.isBroadcaster;

      switch (command) {
        case '!mini':
          chatClient.say(channel, HOST);
          break;
        case '!spin':
          chatClient.say(channel, 'You can request songs by typing !request followed by the song name or spin id. You can look up songs to request on https://spinsha.re/');
          break;
        case '!request':
          await spin.request(chatClient, channel, db, user, args);
          break;
        case '!done':
          if (!mod) {
            chatClient.say(channel, `Sorry, ${user}, only mods may perform this action`);
            break;
          }
          await spin.done(channel, db, args.shift());
          break;
        case '!clear':
          if (!mod) {
            chatClient.say(channel, `Sorry, ${user}, only mods may perform this action`);
            break;
          }
          await spin.clear(channel, db);
          break;
        case '!q':
        case '!queue':
          chatClient.say(channel, HOST + '/queue/' + channel);
          break;
      }
    } catch(err) {
      console.log(err);
    }
  });

  await chatClient.connect();
  for (const channel of channels) {    
    chatClient.say(channel, 'Mini Vanilla reporting for duty!');
  }
};

run();
