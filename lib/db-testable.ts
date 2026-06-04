import Database from 'better-sqlite3';
import { computeHash, computeSealHash, computeWitnessHash } from './utils';

export type FragmentRow = {
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

export type WitnessRow = {
  id: number;
  fragment_id: string;
  witnessed_at: string;
  witness_hash: string;
  fragment_hash: string;
  note: string | null;
};

export type TraceRow = {
  id: number;
  from_id: string;
  to_id: string;
  created_at: string;
};

export function createDb(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  return db;
}

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS fragments (
      id TEXT PRIMARY KEY,
      module TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL,
      sealed_at TEXT,
      seal_statement TEXT,
      seal_hash TEXT,
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
}

export function insertFragment(
  db: Database.Database,
  input: {
    id: string;
    module: string;
    type: string;
    content: string;
    created_at: string;
  }
): FragmentRow {
  const hash = computeHash(input.id, input.created_at, input.module, input.type, input.content);
  
  db.prepare(
    'INSERT INTO fragments (id, module, type, content, created_at, status, sealed_at, seal_statement, seal_hash, hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    input.id,
    input.module,
    input.type,
    input.content,
    input.created_at,
    'ACTIVE',
    null,
    null,
    null,
    hash
  );
  
  return getFragment(db, input.id)!;
}

export function getFragment(db: Database.Database, id: string): FragmentRow | null {
  return db.prepare('SELECT * FROM fragments WHERE id = ?').get(id) as FragmentRow | null;
}

export function sealFragment(
  db: Database.Database,
  id: string,
  sealStatement: string,
  sealedAt: string
): FragmentRow {
  const fragment = getFragment(db, id);
  if (!fragment) {
    throw new Error('Fragment not found');
  }
  if (fragment.status === 'SEALED') {
    return fragment; // Already sealed, no change
  }
  
  const sealHash = computeSealHash(id, sealedAt, fragment.hash, sealStatement);
  
  db.prepare(
    'UPDATE fragments SET status = ?, sealed_at = ?, seal_statement = ?, seal_hash = ? WHERE id = ?'
  ).run('SEALED', sealedAt, sealStatement, sealHash, id);
  
  return getFragment(db, id)!;
}

export function ensureWitnessOnView(
  db: Database.Database,
  fragmentId: string,
  witnessedAt: string
): WitnessRow {
  // Check if witness exists
  const existing = db.prepare('SELECT * FROM witnesses WHERE fragment_id = ?').get(fragmentId) as WitnessRow | null;
  if (existing) {
    return existing;
  }
  
  // Get fragment hash
  const fragment = getFragment(db, fragmentId);
  if (!fragment) {
    throw new Error('Fragment not found');
  }
  
  // Create witness
  const witnessHash = computeWitnessHash(fragmentId, witnessedAt, fragment.hash);
  
  try {
    db.prepare(
      'INSERT INTO witnesses (fragment_id, witnessed_at, witness_hash, fragment_hash, note) VALUES (?, ?, ?, ?, ?)'
    ).run(fragmentId, witnessedAt, witnessHash, fragment.hash, null);
  } catch (err: any) {
    // Race condition: re-read existing
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.message?.includes('UNIQUE constraint')) {
      const witness = db.prepare('SELECT * FROM witnesses WHERE fragment_id = ?').get(fragmentId) as WitnessRow;
      if (witness) {
        return witness;
      }
    }
    throw err;
  }
  
  return db.prepare('SELECT * FROM witnesses WHERE fragment_id = ?').get(fragmentId) as WitnessRow;
}

export function addTraces(
  db: Database.Database,
  fromId: string,
  toIds: string[],
  createdAt: string
): void {
  const insertTrace = db.prepare('INSERT INTO traces (from_id, to_id, created_at) VALUES (?, ?, ?)');
  
  for (const toId of toIds) {
    // Validate target exists
    const target = getFragment(db, toId);
    if (!target) {
      throw new Error(`Fragment ${toId} does not exist`);
    }
    
    // Prevent duplicates
    const existing = db.prepare('SELECT id FROM traces WHERE from_id = ? AND to_id = ?').get(fromId, toId);
    if (!existing) {
      insertTrace.run(fromId, toId, createdAt);
    }
  }
}

export function listFragments(
  db: Database.Database,
  filter?: { status?: 'ACTIVE' | 'SEALED' }
): FragmentRow[] {
  if (filter?.status) {
    return db.prepare('SELECT * FROM fragments WHERE status = ? ORDER BY created_at DESC').all(filter.status) as FragmentRow[];
  }
  return db.prepare('SELECT * FROM fragments ORDER BY created_at DESC').all() as FragmentRow[];
}

export function recomputeFragmentHash(row: FragmentRow): string {
  return computeHash(row.id, row.created_at, row.module, row.type, row.content);
}

export function recomputeSealHash(row: FragmentRow): string {
  if (!row.sealed_at || !row.seal_statement) {
    throw new Error('Fragment is not sealed');
  }
  return computeSealHash(row.id, row.sealed_at, row.hash, row.seal_statement);
}

export function recomputeWitnessHash(witnessRow: WitnessRow): string {
  return computeWitnessHash(witnessRow.fragment_id, witnessRow.witnessed_at, witnessRow.fragment_hash);
}

export function getWitness(db: Database.Database, fragmentId: string): WitnessRow | null {
  return db.prepare('SELECT * FROM witnesses WHERE fragment_id = ?').get(fragmentId) as WitnessRow | null;
}

export function getTraces(db: Database.Database, fromId: string): TraceRow[] {
  return db.prepare('SELECT * FROM traces WHERE from_id = ?').all(fromId) as TraceRow[];
}

export function countTraces(db: Database.Database, fromId: string, toId: string): number {
  const result = db.prepare('SELECT COUNT(*) as count FROM traces WHERE from_id = ? AND to_id = ?').get(fromId, toId) as { count: number };
  return result.count;
}

