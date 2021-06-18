const { ApiClient } = require('twitch');
const { StaticAuthProvider } = require('twitch-auth');
const { ChatClient } = require('twitch-chat-client');
const { Client } = require('pg');

const clientId = process.env.CLIENT_ID;
const accessToken = process.env.ACCESS_TOKEN;
const authProvider = new StaticAuthProvider(clientId, accessToken);

const channel = process.env.CHANNEL;

const SECONDS = 1000;
const MINUTES = 60*SECONDS;

const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

db.connect();
console.log("Database connected");

var timers = [];
db.query('SELECT message,period_mins FROM timers;', (err, res) => {
  if (err) conole.log(err);
  for (let row of res.rows) {
    timers.push(row);
  }
  console.log("Loaded " + timers.length + " timers");
});

const run = async () => {

  const apiClient = new ApiClient({ authProvider });
  const chatClient = new ChatClient(authProvider, { channels: [channel] });
  await chatClient.connect();
  console.log("Chat connected");

  // Register timers
  for (const timer of timers) {
    const offset = Math.floor(Math.random() * timer.period_mins);
    console.log("Registering timer on " + timer.period_mins + "m period (with " + offset + "m offset):");
    console.log(timer.message);
    setTimeout(function() {
      setInterval(function() {
        chatClient.say(channel, timer.message);
      }, timer.period_mins*60*1000);
    }, offset * 60 * 1000);
  }

  chatClient.onRegister(async () => {
    chatClient.say(channel, 'Sgt. Pepper powered on!');
  });

  ['SIGINT', 'SIGTERM'].forEach(signal => process.on(signal, () => {
    chatClient.say(channel, 'Sgt. Pepper powering down...');
    db.end();
    process.exit(0);
  }));

  var chatters = {};

  const listener = chatClient.onMessage(async (channel, user, message, msg) => {
    chatters[user] = new Date(Date.now());

    const args = message.split(' ');
    const command = args.shift().toLowerCase();

    if (command === '!test') {
      chatClient.say(channel, 'Your sound card works perfectly');
    }

    if (command === '!so') {
      const target = await apiClient.helix.users.getUserByName(args.shift());
      const target_channel = await apiClient.helix.channels.getChannelInfo(target);
      chatClient.say(channel, `Shoutout to ${target_channel.displayName}! Follow them at https://twitch.tv/${target_channel.name} They were playing ${target_channel.gameName}`);
    }

    if (command == '!quote') {

      if (args.length == 1 && args[0] == "add") {
        chatClient.say(channel, "You have to... actually say the quote...");
      } else if (args.length > 1 && args[0] == "add" ) {
        args.shift();
        const quote = args.join(' ');
        const game = await apiClient.helix.channels.getChannelInfo(msg.channelId).gameName;
        db.query('INSERT INTO quotes(message, quoted_by, game) VALUES($1, $2, $3) RETURNING id', [quote, user, game], (err, res) => {
          if (err) console.log(err);
          chatClient.say(channel, `Successfully added quote #${res.rows[0].id}`);
        });
      } else if (args.length == 1 && args[0].match(/^\d+$/)) {
        const id = parseInt(args[0], 10);
        db.query('SELECT id, message, game, created_at FROM quotes WHERE id = $1;', [id], (err, res) => {
          if (err) console.log(err);
          if (res.rows.length > 0) {
            const q = res.rows[0]
            const date = new Date(q.created_at);
            chatClient.say(channel, `#${q.id}: "${q.message}" [${q.game}] ${date.toDateString()}`);
          } else {
            chatClient.say(channel, `Quote #${id} not found`);
          }
        });
      } else {
        db.query('SELECT id, message, game, created_at FROM quotes;', (err, res) => {
          if (err) console.log(err);
          const i = Math.floor(Math.random() * res.rows.length);
          const q = res.rows[i]
          const date = new Date(q.created_at);
          chatClient.say(channel, `#${q.id}: "${q.message}" [${q.game}] ${date.toDateString()}`);
        });
      } 
    }


    if (command == '!chatters') {
      for (const chatter in chatters) {
        chatClient.say(channel, chatter + ' last spoke at ' + chatters[chatter].toString());
      }
    }
  });
};



run();