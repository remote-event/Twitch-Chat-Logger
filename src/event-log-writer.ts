import { mkdir, appendFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { TwitchIrcCommand, type TwitchIrcMessage } from "./twitch-irc-client.js";

export type TwitchChatMessageRecord = {
  timestamp: string;
  username: string | undefined;
  nickname: string | undefined;
  message: string;
};

export type EventLogWriterOptions = {
  rootDir?: string;
};

const DEFAULT_ROOT_DIR = "data/events/twitch";

export class EventLogWriter {
  private readonly rootDir: string;

  public constructor(options: EventLogWriterOptions = {}) {
    this.rootDir = options.rootDir ?? DEFAULT_ROOT_DIR;
  }

  public async write(message: TwitchIrcMessage): Promise<void> {
    const record = toTwitchChatMessageRecord(message);

    if (record === undefined) {
      return;
    }

    const filePath = this.getFilePath(message);

    await mkdir(dirname(filePath), { recursive: true });
    await appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
  }

  private getFilePath(message: TwitchIrcMessage): string {
    const date = new Date().toISOString().slice(0, 10);
    const channel = message.channel === undefined ? "_unknown" : safePathSegment(message.channel);

    return join(this.rootDir, `channel=${channel}`, `date=${date}`, "chat_messages.jsonl");
  }
}

export function toTwitchChatMessageRecord(
  message: TwitchIrcMessage,
): TwitchChatMessageRecord | undefined {
  if (message.command !== TwitchIrcCommand.PrivateMessage || message.text === undefined) {
    return undefined;
  }

  return {
    timestamp: getMessageTimestamp(message).toISOString(),
    username: message.source?.username ?? message.source?.nickname,
    nickname: getTag(message, "display-name") ?? message.source?.nickname,
    message: message.text,
  };
}

function getMessageTimestamp(message: TwitchIrcMessage): Date {
  const sentTimestamp = getTag(message, "tmi-sent-ts");

  if (sentTimestamp !== undefined) {
    const sentTime = Number(sentTimestamp);
    const sentDate = new Date(sentTime);

    if (Number.isFinite(sentTime) && Number.isFinite(sentDate.getTime())) {
      return sentDate;
    }
  }

  return new Date();
}

function getTag(message: TwitchIrcMessage, key: string): string | undefined {
  const value = message.tags[key];
  return typeof value === "string" ? value : undefined;
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
}
