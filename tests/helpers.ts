import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { unlinkSync } from 'fs';
import Database from 'better-sqlite3';
import { createDb, initSchema } from '../lib/db-testable';

export function makeTempDbPath(): string {
  const randomName = randomBytes(8).toString('hex');
  return join(tmpdir(), `spiral-test-${randomName}.sqlite`);
}

export async function withTestDb<T>(
  fn: (db: Database.Database) => T
): Promise<T> {
  const dbPath = makeTempDbPath();
  const db = createDb(dbPath);
  
  try {
    initSchema(db);
    return fn(db);
  } finally {
    db.close();
    try {
      unlinkSync(dbPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

export function nowIso(): string {
  return new Date('2026-01-15T00:00:00Z').toISOString();
}

export function generateFragmentId(dateStr: string): string {
  const date = dateStr.slice(0, 10).replace(/-/g, '');
  const random = randomBytes(2).toString('hex').toUpperCase();
  return `FRAG-${date}-${random}`;
}

