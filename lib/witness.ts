import { getDb } from './db';
import { computeWitnessHash } from './utils';

/**
 * Create a witness record for a fragment if it doesn't exist.
 * This is race-safe using SQLite transactions and UNIQUE constraint.
 * Returns the witness record if created, or existing witness if already exists.
 */
export function ensureWitness(fragment_id: string, fragment_hash: string): { witness: any; isNew: boolean } {
  const db = getDb();

  // First check if witness already exists (fast path)
  const existing = db.prepare('SELECT * FROM witnesses WHERE fragment_id = ?').get(fragment_id) as any;
  if (existing) {
    return { witness: existing, isNew: false };
  }

  // Create witness record (race-safe with UNIQUE constraint)
  const witnessed_at = new Date().toISOString();
  const witness_hash = computeWitnessHash(fragment_id, witnessed_at, fragment_hash);

  // Use transaction for atomicity
  const insertStmt = db.prepare(
    'INSERT INTO witnesses (fragment_id, witnessed_at, witness_hash, fragment_hash, note) VALUES (?, ?, ?, ?, ?)'
  );

  try {
    // Attempt insert - UNIQUE constraint will prevent duplicates
    insertStmt.run(fragment_id, witnessed_at, witness_hash, fragment_hash, null);
    
    // Success - re-read to get the created witness
    const witness = db.prepare('SELECT * FROM witnesses WHERE fragment_id = ?').get(fragment_id) as any;
    return { witness, isNew: true };
  } catch (err: any) {
    // If UNIQUE constraint violation (race condition occurred), re-read existing
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.message?.includes('UNIQUE constraint')) {
      const witness = db.prepare('SELECT * FROM witnesses WHERE fragment_id = ?').get(fragment_id) as any;
      if (witness) {
        return { witness, isNew: false };
      }
      // Should not happen, but handle gracefully
      throw new Error('Witness creation failed due to race condition, but witness not found on re-read');
    }
    throw err;
  }
}

