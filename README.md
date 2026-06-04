# Spiral Record

The smallest irreversible language registry (append-only).

## Features

- **Submit Fragment**: Create immutable fragments with module, type, and content
- **View Fragment**: Display full fragment details with hash for integrity
- **List Feed**: Browse all fragments in reverse chronological order with filtering
- **Seal Fragment**: Mark fragments as SEALED (irreversible status change)
- **Trace Fragments**: Create references between fragments (append-only)

## Core Rules

- **NO EDIT, NO DELETE**: Fragments cannot be edited or deleted after creation
- **Only allowed mutations**: Sealing (status flip) and adding trace references
- **Content stored exactly as submitted**: No markdown processing, no transformations

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- SQLite (better-sqlite3)
- Minimal CSS (Shandira Design System)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Seed database with sample data (optional):
```bash
npm run seed
```

The application will be available at `http://localhost:3000`.

## Data Storage

Data is persisted in a local SQLite file: `./data/spiral-record.sqlite`

The database is automatically initialized on first run.

## Project Structure

```
spiral-record/
├── app/
│   ├── actions.ts          # Server actions
│   ├── api/
│   │   └── health/         # Health check endpoint
│   ├── f/[id]/             # Fragment detail page
│   ├── feed/               # Feed listing page
│   ├── globals.css         # Global styles (Shandira design)
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Homepage with submission form
├── lib/
│   ├── db.ts               # Database initialization
│   └── utils.ts            # Utility functions
├── scripts/
│   └── seed.ts             # Database seeding script
└── data/                   # SQLite database (gitignored)
```

## API Endpoints

- `GET /api/health` - Returns `{ ok: true, version: "0.1" }`

## Fragment Types

- `claim`
- `promise`
- `definition`
- `confession`
- `note` (default)

## Fragment ID Format

`FRAG-YYYYMMDD-XXXX` where XXXX is 4 hex random uppercase characters.

Example: `FRAG-20260114-8F3A`

## Integrity

Each fragment includes a SHA-256 hash computed over:
`id|created_at|module|type|content`

This ensures data integrity and immutability verification.

## Local development (machine specs)

- **Port: 5252**（machine/ports.md · 5xxx spiral universe）
- 雙擊 `自動localhost.command` → `next dev -p 5252` → http://localhost:5252
- `自動push.command` 接 machine/specs/01-deploy；遠端 repo 待建（建議 private）

定位：spiral-core 的工程落地層。前端純工程功能、無 lore——運行核，不是敘事面。

### 扶正紀錄 2026-06-04

- git init + initial commit（main，52 files）
- 移除 9 個檔案內共 18 段 `#region agent log` 調試注入（殘留的 127.0.0.1:7246 debug POST）
- 接入 machine 01-deploy / 02-localhost 薄殼，ports.md 5252 已登記

## License

MIT

