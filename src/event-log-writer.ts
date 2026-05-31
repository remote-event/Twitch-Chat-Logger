import { mkdir, appendFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { TwitchIrcMessage } from "./twitch-irc-client.js";

export type TwitchEventRecord = {
  schemaVersion: 1;
  platform: "twitch";
  type: string;
  command: string;
  messageId: string | undefined;
  timestamp: string;
  twitchTimestamp: string | undefined;
  channel: string | undefined;
  roomId: string | undefined;
  userId: string | undefined;
  username: string | undefined;
  displayName: string | undefined;
  text: string | undefined;
  params: string[];
  badges: string[];
  color: string | undefined;
  tags: Record<string, string | true>;
  source: {
    raw: string;
    nickname: string | undefined;
    username: string | undefined;
    host: string | undefined;
  } | undefined;
  raw: string;
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
    const record = toTwitchEventRecord(message);
    const filePath = this.getFilePath(record);

    await mkdir(dirname(filePath), { recursive: true });
    await appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
  }

  private getFilePath(record: TwitchEventRecord): string {
    const date = record.timestamp.slice(0, 10);
    const channel = record.channel === undefined ? "_system" : safePathSegment(record.channel);
    const eventType = safePathSegment(record.type);

    return join(
      this.rootDir,
      `channel=${channel}`,
      `date=${date}`,
      `${eventType}.jsonl`,
    );
  }
}

export function toTwitchEventRecord(message: TwitchIrcMessage): TwitchEventRecord {
  const twitchTimestamp = getTag(message, "tmi-sent-ts");
  const timestamp =
    twitchTimestamp === undefined
      ? new Date().toISOString()
      : new Date(Number(twitchTimestamp)).toISOString();

  return {
    schemaVersion: 1,
    platform: "twitch",
    type: getEventType(message),
    command: message.command,
    messageId: getTag(message, "id"),
    timestamp,
    twitchTimestamp,
    channel: message.channel,
    roomId: getTag(message, "room-id"),
    userId: getTag(message, "user-id"),
    username: message.source?.nickname,
    displayName: getTag(message, "display-name"),
    text: message.text,
    params: message.params,
    badges: splitCsvTag(getTag(message, "badges")),
    color: getTag(message, "color"),
    tags: message.tags,
    source: message.source,
    raw: message.raw,
  };
}

function getEventType(message: TwitchIrcMessage): string {
  switch (message.command) {
    case "PRIVMSG":
      return "chat_message";
    case "USERNOTICE":
      return getTag(message, "msg-id") ?? "user_notice";
    case "CLEARCHAT":
      return "clear_chat";
    case "CLEARMSG":
      return "clear_message";
    case "ROOMSTATE":
      return "room_state";
    case "USERSTATE":
      return "user_state";
    case "JOIN":
      return "join";
    case "PART":
      return "part";
    case "NOTICE":
      return "notice";
    case "PING":
      return "ping";
    case "RECONNECT":
      return "reconnect";
    default:
      return message.command.toLowerCase();
  }
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
