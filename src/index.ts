import { TwitchIrcClient } from "./twitch-irc-client.js";

const client = new TwitchIrcClient();

client.onMessage((message) => {
  console.log(JSON.stringify(message, null, 2));
});

await client.connect();
console.log("Connected to Twitch IRC.");
