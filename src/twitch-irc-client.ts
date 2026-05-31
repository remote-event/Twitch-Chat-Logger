export type TwitchIrcClientOptions = {
  url?: string;
  nickname?: string;
  token?: string;
};

export type TwitchIrcMessage = {
  raw: string;
  tags: Record<string, string | true>;
  source: TwitchIrcMessageSource | undefined;
  command: string;
  channel: string | undefined;
  params: string[];
  text: string | undefined;
};

export type TwitchIrcMessageSource = {
  raw: string;
  nickname: string | undefined;
  username: string | undefined;
  host: string | undefined;
};

export type TwitchIrcMessageHandler = (message: TwitchIrcMessage) => void;

const DEFAULT_URL = "wss://irc-ws.chat.twitch.tv/";
const DEFAULT_NICKNAME = "justinfan";
const ANONYMOUS_TOKEN = "SCHMOOPIIE";

export class TwitchIrcClient {
  private readonly url: string;
  private readonly nickname: string;
  private readonly token: string;
  private socket: WebSocket | undefined;
  private messageHandler: TwitchIrcMessageHandler | undefined;

  public constructor(options: TwitchIrcClientOptions = {}) {
    this.url = options.url ?? DEFAULT_URL;
    this.nickname =
      options.nickname ?? `${DEFAULT_NICKNAME}${Math.floor(Math.random() * 100000)}`;
    this.token = options.token ?? ANONYMOUS_TOKEN;
  }

  public connect(): Promise<void> {
    if (this.socket !== undefined) {
      throw new Error("Twitch IRC client is already connected or connecting.");
    }

    const socket = new WebSocket(this.url);
    this.socket = socket;

    return new Promise((resolve, reject) => {
      socket.addEventListener(
        "open",
        () => {
          this.sendRaw("CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership");
          this.sendRaw(`PASS ${this.token}`);
          this.sendRaw(`NICK ${this.nickname}`);
          resolve();
        },
        { once: true },
      );

      socket.addEventListener(
        "error",
        () => {
          this.socket = undefined;
          reject(new Error("Failed to connect to Twitch IRC."));
        },
        { once: true },
      );

      socket.addEventListener("message", (event) => {
        this.handleMessage(String(event.data));
      });

      socket.addEventListener("close", () => {
        this.socket = undefined;
      });
    });
  }

  public join(channel: string): void {
    this.sendRaw(`JOIN ${this.formatChannel(channel)}`);
  }

  public joinMany(channels: string[]): void {
    if (channels.length === 0) {
      throw new Error("At least one channel is required.");
    }

    const formattedChannels = channels.map((channel) => this.formatChannel(channel));
    this.sendRaw(`JOIN ${formattedChannels.join(",")}`);
  }

  public disconnect(): void {
    this.socket?.close(1000, "Client disconnected.");
    this.socket = undefined;
  }

  public onMessage(handler: TwitchIrcMessageHandler): () => void {
    this.messageHandler = handler;

    return () => {
      if (this.messageHandler === handler) {
        this.messageHandler = undefined;
      }
    };
  }

  public sendRaw(line: string): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      throw new Error("Twitch IRC client is not connected.");
    }

    this.socket.send(line);
  }

  private formatChannel(channel: string): string {
    const normalizedChannel = channel.trim().replace(/^#/, "").toLowerCase();

    if (normalizedChannel.length === 0) {
      throw new Error("Channel name cannot be empty.");
    }

    return `#${normalizedChannel}`;
  }

  private handleMessage(payload: string): void {
    const messages = payload.split("\r\n").filter((message) => message.length > 0);

    for (const rawMessage of messages) {
      const message = parseTwitchIrcMessage(rawMessage);

      if (message.command === "PING") {
        this.sendRaw(`PONG :${message.text ?? "tmi.twitch.tv"}`);
      }

      this.messageHandler?.(message);
    }
  }
}

export function parseTwitchIrcMessage(raw: string): TwitchIrcMessage {
  let remaining = raw;
  let tags: Record<string, string | true> = {};
  let source: TwitchIrcMessageSource | undefined;

  if (remaining.startsWith("@")) {
    const tagEndIndex = remaining.indexOf(" ");

    if (tagEndIndex === -1) {
      throw new Error(`Invalid IRC message tags: ${raw}`);
    }

    tags = parseTags(remaining.slice(1, tagEndIndex));
    remaining = remaining.slice(tagEndIndex + 1);
  }

  if (remaining.startsWith(":")) {
    const sourceEndIndex = remaining.indexOf(" ");

    if (sourceEndIndex === -1) {
      throw new Error(`Invalid IRC message source: ${raw}`);
    }

    source = parseSource(remaining.slice(1, sourceEndIndex));
    remaining = remaining.slice(sourceEndIndex + 1);
  }

  const { commandAndParams, text } = splitTrailingText(remaining);
  const parts = commandAndParams.split(" ").filter((part) => part.length > 0);
  const command = parts[0];

  if (command === undefined) {
    throw new Error(`Invalid IRC message command: ${raw}`);
  }

  const params = parts.slice(1);
  const channelParam = params.find((param) => param.startsWith("#"));

  return {
    raw,
    tags,
    source,
    command,
    channel: channelParam?.slice(1),
    params,
    text,
  };
}

function parseTags(rawTags: string): Record<string, string | true> {
  const tags: Record<string, string | true> = {};

  for (const tag of rawTags.split(";")) {
    const separatorIndex = tag.indexOf("=");

    if (separatorIndex === -1) {
      tags[tag] = true;
      continue;
    }

    const key = tag.slice(0, separatorIndex);
    const value = tag.slice(separatorIndex + 1);
    tags[key] = unescapeTagValue(value);
  }

  return tags;
}

function parseSource(rawSource: string): TwitchIrcMessageSource {
  const sourceMatch = /^(?<nickname>[^!@]+)?(?:!(?<username>[^@]+))?(?:@(?<host>.+))?$/.exec(
    rawSource,
  );

  return {
    raw: rawSource,
    nickname: sourceMatch?.groups?.nickname,
    username: sourceMatch?.groups?.username,
    host: sourceMatch?.groups?.host,
  };
}

function splitTrailingText(message: string): {
  commandAndParams: string;
  text: string | undefined;
} {
  const trailingIndex = message.indexOf(" :");

  if (trailingIndex === -1) {
    return {
      commandAndParams: message,
      text: undefined,
    };
  }

  return {
    commandAndParams: message.slice(0, trailingIndex),
    text: message.slice(trailingIndex + 2),
  };
}

function unescapeTagValue(value: string): string {
  return value.replace(/\\([snr:\\])/g, (_match, escaped: string) => {
    switch (escaped) {
      case "s":
        return " ";
      case "n":
        return "\n";
      case "r":
        return "\r";
      case ":":
        return ";";
      case "\\":
        return "\\";
      default:
        return escaped;
    }
  });
}
