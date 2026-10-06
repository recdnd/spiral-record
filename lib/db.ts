import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { IS_READ_ONLY } from './readonly';

// 可寫核心：./data（本機）。唯讀部署：build 時烘入的快照（npm run snapshot 產生）。
const DB_PATH = IS_READ_ONLY
  ? join(process.cwd(), 'snapshot', 'spiral-record.sqlite')
  : join(process.cwd(), 'data', 'spiral-record.sqlite');

// Ensure data directory exists (write mode only)
if (!IS_READ_ONLY) {
  const dir = join(process.cwd(), 'data');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) {
    return db;
  }

  if (IS_READ_ONLY) {
    // 唯讀快照：不建表、不遷移、不設 WAL（readonly 檔案系統上都會炸）
    db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
    return db;
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Initialize tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS fragments (
      id TEXT PRIMARY KEY,
      module TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL,
      sealed_at TEXT,
      hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS traces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_id TEXT NOT NULL,
      to_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(from_id) REFERENCES fragments(id),
      FOREIGN KEY(to_id) REFERENCES fragments(id)
    );

    CREATE TABLE IF NOT EXISTS witnesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fragment_id TEXT NOT NULL UNIQUE,
      witnessed_at TEXT NOT NULL,
      witness_hash TEXT NOT NULL,
      fragment_hash TEXT NOT NULL,
      note TEXT,
      FOREIGN KEY(fragment_id) REFERENCES fragments(id)
    );

    CREATE TABLE IF NOT EXISTS meta_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meta_id TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      source TEXT NOT NULL,
      module TEXT NOT NULL,
      fragment_id TEXT,
      directive TEXT NOT NULL,
      raw_line TEXT NOT NULL,
      meta_hash TEXT NOT NULL,
      FOREIGN KEY(fragment_id) REFERENCES fragments(id)
    );

    CREATE INDEX IF NOT EXISTS idx_fragments_created_at ON fragments(created_at);
    CREATE INDEX IF NOT EXISTS idx_traces_from_id ON traces(from_id);
    CREATE INDEX IF NOT EXISTS idx_traces_to_id ON traces(to_id);
    CREATE INDEX IF NOT EXISTS idx_witnesses_witnessed_at ON witnesses(witnessed_at);
    CREATE INDEX IF NOT EXISTS idx_meta_audit_created_at ON meta_audit(created_at);
    CREATE INDEX IF NOT EXISTS idx_meta_audit_fragment_id ON meta_audit(fragment_id);
  `);

  // Migrate: Add seal_statement and seal_hash columns if they don't exist
  const tableInfo = db.prepare("PRAGMA table_info(fragments)").all() as Array<{ name: string }>;
  const columnNames = tableInfo.map(col => col.name);
  
  if (!columnNames.includes('seal_statement')) {
    try {
      db.exec('ALTER TABLE fragments ADD COLUMN seal_statement TEXT');
    } catch (err: any) {
      console.warn('Failed to add seal_statement column:', err.message);
    }
  }
  
  if (!columnNames.includes('seal_hash')) {
    try {
      db.exec('ALTER TABLE fragments ADD COLUMN seal_hash TEXT');
    } catch (err: any) {
      console.warn('Failed to add seal_hash column:', err.message);
    }
  }

  return db;
}

export type Fragment = {
  id: string;
  module: string;
  type: string;
  content: string;
  created_at: string;
  status: 'ACTIVE' | 'SEALED';
  sealed_at: string | null;
  seal_statement: string | null;
  seal_hash: string | null;
  hash: string;
};

export type Trace = {
  id: number;
  from_id: string;
  to_id: string;
  created_at: string;
};

export type Witness = {
  id: number;
  fragment_id: string;
  witnessed_at: string;
  witness_hash: string;
  fragment_hash: string;
  note: string | null;
};

export type MetaAudit = {
  id: number;
  meta_id: string;
  created_at: string;
  source: 'submission' | 'system';
  module: string;
  fragment_id: string | null;
  directive: string;
  raw_line: string;
  meta_hash: string;
};

