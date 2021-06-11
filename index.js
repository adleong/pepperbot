const { ApiClient } = require('twitch');
const { StaticAuthProvider } = require('twitch-auth');
const { ChatClient } = require('twitch-chat-client');

const clientId = process.env.CLIENT_ID;
const accessToken = process.env.ACCESS_TOKEN;
const authProvider = new StaticAuthProvider(clientId, accessToken);

const channel = process.env.CHANNEL;

const SECONDS = 1000;
const MINUTES = 60*SECONDS;

const run = async () => {

  const apiClient = new ApiClient({ authProvider });
  const chatClient = new ChatClient(authProvider, { channels: [channel] });
  // listen to more events...
  await chatClient.connect();

  chatClient.onRegister(async () => {
    chatClient.say(channel, 'Sgt. Pepper powered on!');
  });

  process.on('SIGINT', function(){
    chatClient.say(channel, 'Sgt. Pepper powering down...');
    process.exit(0);
  });

  // var running = 0;
  // setInterval(function(){
  //   running++;
  //   chatClient.say(channel, 'Sgt. Pepper has been running for ' + running + 'minutes');
  // }, 1*MINUTES);
  var chatters = {};

  const listener = chatClient.onMessage(async (channel, user, message, msg) => {
    chatters[user] = new Date(Date.now());
    if (message === '!test') {
      chatClient.say(channel, 'Your sound card works perfectly');
    }
    if (message == '!chatters') {
      for (const chatter in chatters) {
        chatClient.say(channel, chatter + ' last spoke at ' + chatters[chatter].toString());
      }
    }
  });
};



run();