# Twitch Event Logger

A small TypeScript app that connects to Twitch IRC over WebSocket, joins one or more channels, parses incoming IRC messages, and writes normalized JSONL event records for later analysis or model training.

## Features

- Anonymous Twitch IRC connection
- Multi-channel joins with `TWITCH_CHANNELS`
- Parsed IRC messages with tags, source, command, channel, params, and text
- JSONL output for Twitch IRC events such as chat messages, user notices, joins, parts, room state changes, clears, notices, pings, and reconnects

## Requirements

- Node.js 20 or newer
- npm

Docker is optional.

## Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
TWITCH_CHANNELS=xqc,lirik
```

## Run

For development:

```bash
npm run dev
```

For the compiled app:

```bash
npm run build
npm start
```

## Scripts

```bash
npm run lint
npm run typecheck
npm run build
npm start
```

## Data Output

Events are written as JSON Lines under:

```text
data/events/twitch/channel=<channel>/date=<yyyy-mm-dd>/<event-type>.jsonl
```

Each line is one normalized Twitch event:

```json
{
  "schemaVersion": 1,
  "platform": "twitch",
  "type": "chat_message",
  "command": "PRIVMSG",
  "messageId": "f7ebdc6e-b360-4de2-aca3-bf4652755c28",
  "timestamp": "2026-05-31T08:30:00.000Z",
  "twitchTimestamp": "1780215664496",
  "channel": "xqc",
  "roomId": "71092938",
  "userId": "250294961",
  "username": "lemongth",
  "displayName": "lemonGTH",
  "text": "OfCourse",
  "params": ["#xqc"],
  "badges": ["subscriber/36"],
  "color": "#FF4500",
  "tags": {
    "badges": "subscriber/36",
    "display-name": "lemonGTH"
  },
  "source": {
    "raw": "lemongth!lemongth@lemongth.tmi.twitch.tv",
    "nickname": "lemongth",
    "username": "lemongth",
    "host": "lemongth.tmi.twitch.tv"
  },
  "raw": "@badge-info=..."
}
```

The `data/` directory is ignored by git.

## Docker

Build the image:

```bash
docker build -t twitch-event-logger .
```

Run it with an env file and a mounted data directory on Windows PowerShell:

```bash
docker run --rm --env-file .env -v "${PWD}/data:/app/data" twitch-event-logger
```

On macOS/Linux, use:

```bash
docker run --rm --env-file .env -v "$(pwd)/data:/app/data" twitch-event-logger
```
