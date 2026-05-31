import "dotenv/config";
import { ChatLogWriter } from "./chat-log-writer.js";
import { TwitchIrcClient } from "./twitch-irc-client.js";

const client = new TwitchIrcClient();
const writer = new ChatLogWriter();
const channels = getChannels();

client.onMessage((message) => {
  if (message.command !== "PRIVMSG") {
    return;
  }

  void writer.write(message).catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to write chat message: ${errorMessage}`);
  });
});

await client.connect();
client.joinMany(channels);
console.log("Connected to Twitch IRC.");
console.log(`Logging channels: ${channels.join(", ")}`);

function getChannels(): string[] {
  const rawChannels = process.env.TWITCH_CHANNELS ?? "xqc";

  return rawChannels
    .split(",")
    .map((channel) => channel.trim())
    .filter((channel) => channel.length > 0);
}
