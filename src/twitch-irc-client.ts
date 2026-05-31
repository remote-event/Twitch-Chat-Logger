export type TwitchIrcClientOptions = {
  url?: string;
  nickname?: string;
  token?: string;
};

export type TwitchIrcMessageHandler = (message: string) => void;

const DEFAULT_URL = "wss://irc-ws.chat.twitch.tv/";
const DEFAULT_NICKNAME = "justinfan";
const ANONYMOUS_TOKEN = "SCHMOOPIIE";

export class TwitchIrcClient {
  private readonly url: string;
  private readonly nickname: string;
  private readonly token: string;
  private socket: WebSocket | undefined;
  private readonly messageHandlers = new Set<TwitchIrcMessageHandler>();

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
    const normalizedChannel = channel.trim().replace(/^#/, "").toLowerCase();

    if (normalizedChannel.length === 0) {
      throw new Error("Channel name cannot be empty.");
    }

    this.sendRaw(`JOIN #${normalizedChannel}`);
  }

  public disconnect(): void {
    this.socket?.close(1000, "Client disconnected.");
    this.socket = undefined;
  }

  public onMessage(handler: TwitchIrcMessageHandler): () => void {
    this.messageHandlers.add(handler);

    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  public sendRaw(line: string): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      throw new Error("Twitch IRC client is not connected.");
    }

    this.socket.send(line);
  }

  private handleMessage(payload: string): void {
    const messages = payload.split("\r\n").filter((message) => message.length > 0);

    for (const message of messages) {
      if (message.startsWith("PING")) {
        this.sendRaw(message.replace("PING", "PONG"));
      }

      for (const handler of this.messageHandlers) {
        handler(message);
      }
    }
  }
}
