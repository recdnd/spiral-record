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

## Deployment Model（2026-07-29 拍板，二輪修訂）

**record.spiral.ooo = 線上應用門面：進入後建倉。**

每個訪客的登記簿存在**自己瀏覽器**的 IndexedDB 裡（`lib/client/`）——寫入永遠發生在擁有磁碟的人手上，零帳號、零後端持久、零 SQL 服務。完整性邏輯（canonical / hash / seal / witness）與伺服器版逐字對齊，Web Crypto 實作，`Verify` 客戶端可重算。支援匯出（hash-verified JSON）與匯入（僅空倉，append-only 律）。

- `/` — 門面 + RegistryGate（無倉建倉、有倉入倉）
- `/my` — 你的倉：提交 / feed / 匯出匯入
- `/my/f/<id>` — fragment 視圖：payload / verify / seal / trace / witness
- 代價（誠實承認）：無全域公共 feed，各倉互不可見；換瀏覽器＝另一個倉（用匯出/匯入遷移）

**伺服器側 SQLite 仍在**，供本機可寫實例（`npm run dev`）使用；線上部署時為唯讀快照（見下），`/feed` 等舊路徑照常服務。

### 唯讀快照（伺服器側，過渡自一輪修訂）

Vercel serverless 的 /tmp 短命且每實例一份——不可逆登記簿放上面等於承諾不可逆、實際保證失憶。因此：

- 部署偵測到 `VERCEL`（或 `REC_READ_ONLY=1`）即進唯讀模式：開 `snapshot/spiral-record.sqlite`（readonly）、submit/seal/trace/witness 全部拒絕、首頁表單換成告示。
- 更新線上內容的儀式：本地寫 → `npm run snapshot`（checkpoint WAL + 烘快照）→ commit `snapshot/` → push → Vercel 重建。

### Turso TODO（日後若要線上可寫）

既定待辦：db 層換 [Turso](https://turso.tech)（libSQL，SQLite 相容）即可線上真持久。代價是第三方依賴 + 開帳號。在家族真的需要「外人可線上提交」之前不做。

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

