import "dotenv/config";
import { EventLogWriter } from "./event-log-writer.js";
import { TwitchIrcClient } from "./twitch-irc-client.js";

const client = new TwitchIrcClient();
const writer = new EventLogWriter();
const channels = getChannels();

client.onMessage((message) => {
  void writer.write(message).catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to write Twitch event: ${errorMessage}`);
  });
});

await client.connect();
client.joinMany(channels);
console.log("Connected to Twitch IRC.");
console.log(`Logging Twitch events for channels: ${channels.join(", ")}`);

function getChannels(): string[] {
  const rawChannels = process.env.TWITCH_CHANNELS ?? "xqc";

  return rawChannels
    .split(",")
    .map((channel) => channel.trim())
    .filter((channel) => channel.length > 0);
}
