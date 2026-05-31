# Twitch Chat Logger

A small TypeScript app that connects to Twitch IRC over WebSocket, joins one or more channels, and writes chat messages to JSONL.

## Features

- Anonymous Twitch IRC connection
- Multi-channel joins with `TWITCH_CHANNELS`
- JSONL output for chat messages only
- Compact records containing `timestamp`, `username`, `nickname`, and `message`

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

Chat messages are written as JSON Lines under:

```text
data/events/twitch/channel=<channel>/date=<yyyy-mm-dd>/chat_messages.jsonl
```

Each line is one Twitch chat message:

```json
{
  "timestamp": "2026-05-31T23:21:14.123Z",
  "username": "lemongth",
  "nickname": "lemonGTH",
  "message": "OfCourse"
}
```

The `data/` directory is ignored by git.

## Docker

Build the image:

```bash
docker build -t twitch-chat-logger .
```

Run it with an env file and a mounted data directory on Windows PowerShell:

```bash
docker run --rm --env-file .env -v "${PWD}/data:/app/data" twitch-chat-logger
```

On macOS/Linux, use:

```bash
docker run --rm --env-file .env -v "$(pwd)/data:/app/data" twitch-chat-logger
```
