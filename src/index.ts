import { TwitchIrcClient } from "./twitch-irc-client.js";

const client = new TwitchIrcClient();

client.onMessage((message) => {
  console.log(message);
});

await client.connect();
console.log("Connected to Twitch IRC.");
