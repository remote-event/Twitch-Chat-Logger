import { mkdir, appendFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { TwitchIrcMessage } from "./twitch-irc-client.js";

export type TrainingChatMessage = {
  schemaVersion: 1;
  platform: "twitch";
  type: "chat_message";
  messageId: string | undefined;
  timestamp: string;
  twitchTimestamp: string | undefined;
  channel: string;
  roomId: string | undefined;
  userId: string | undefined;
  username: string | undefined;
  displayName: string | undefined;
  text: string;
  badges: string[];
  color: string | undefined;
  isMod: boolean;
  isSubscriber: boolean;
  isFirstMessage: boolean;
  isReturningChatter: boolean;
  raw: string;
};

export type ChatLogWriterOptions = {
  rootDir?: string;
};

const DEFAULT_ROOT_DIR = "data/chat/twitch";

export class ChatLogWriter {
  private readonly rootDir: string;

  public constructor(options: ChatLogWriterOptions = {}) {
    this.rootDir = options.rootDir ?? DEFAULT_ROOT_DIR;
  }

  public async write(message: TwitchIrcMessage): Promise<void> {
    const record = toTrainingChatMessage(message);

    if (record === undefined) {
      return;
    }

    const filePath = this.getFilePath(record);
    await mkdir(dirname(filePath), { recursive: true });
    await appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
  }

  private getFilePath(record: TrainingChatMessage): string {
    const date = record.timestamp.slice(0, 10);
    const channel = safePathSegment(record.channel);

    return join(
      this.rootDir,
      `channel=${channel}`,
      `date=${date}`,
      "messages.jsonl",
    );
  }
}

export function toTrainingChatMessage(
  message: TwitchIrcMessage,
): TrainingChatMessage | undefined {
  if (message.command !== "PRIVMSG" || message.channel === undefined) {
    return undefined;
  }

  const text = message.text ?? "";
  const twitchTimestamp = getTag(message, "tmi-sent-ts");
  const timestamp =
    twitchTimestamp === undefined
      ? new Date().toISOString()
      : new Date(Number(twitchTimestamp)).toISOString();

  return {
    schemaVersion: 1,
    platform: "twitch",
    type: "chat_message",
    messageId: getTag(message, "id"),
    timestamp,
    twitchTimestamp,
    channel: message.channel,
    roomId: getTag(message, "room-id"),
    userId: getTag(message, "user-id"),
    username: message.source?.nickname,
    displayName: getTag(message, "display-name"),
    text,
    badges: splitCsvTag(getTag(message, "badges")),
    color: getTag(message, "color"),
    isMod: getTag(message, "mod") === "1",
    isSubscriber: getTag(message, "subscriber") === "1",
    isFirstMessage: getTag(message, "first-msg") === "1",
    isReturningChatter: getTag(message, "returning-chatter") === "1",
    raw: message.raw,
  };
}

function getTag(message: TwitchIrcMessage, key: string): string | undefined {
  const value = message.tags[key];
  return typeof value === "string" ? value : undefined;
}

function splitCsvTag(value: string | undefined): string[] {
  if (value === undefined || value.length === 0) {
    return [];
  }

  return value.split(",").filter((item) => item.length > 0);
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
}
