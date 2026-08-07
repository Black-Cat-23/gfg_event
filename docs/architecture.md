# RecruitQuest — Technical Architecture

## 1. High-level overview

- **SPA frontend**: React 18 + Vite + Tailwind + Socket.IO-client served via Vercel or Node.
- **Backend**: Node.js + Express + Socket.IO server. Single owner of all game state.
- **Database**: SQLite (via `better-sqlite3` and Drizzle ORM) for persistent data.

## 2. Monorepo Structure

```
EventWeb/
├── docs/
├── packages/
│   ├── types/                ← shared TS types, zod schemas, socket payloads
│   └── activities/           ← activity definitions (quiz, market)
└── apps/
    ├── web/                  ← React SPA
    └── server/               ← Express + Socket.IO server + SQLite
```

## 3. Realtime Design & Rooms

- `event:{id}:admin`: Admin room
- `event:{id}:team`: All team sockets
- `team:{teamId}`: Single active device per team
- `event:{id}`: Global transitions
