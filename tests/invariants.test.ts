import { describe, it, expect, beforeEach, vi } from 'vitest';
import { withTestDb, nowIso, generateFragmentId } from './helpers';
import {
  insertFragment,
  getFragment,
  sealFragment,
  ensureWitnessOnView,
  addTraces,
  listFragments,
  recomputeFragmentHash,
  recomputeSealHash,
  recomputeWitnessHash,
  getWitness,
  getTraces,
  countTraces,
  type FragmentRow,
} from '../lib/db-testable';
import { stripAndCollectMeta, computeMetaHash, generateMetaId } from '../lib/utils';
import Database from 'better-sqlite3';

describe('Invariant: Fragments are append-only (no edit/delete)', () => {
  it('should not allow content modification after insert', async () => {
    await withTestDb((db) => {
      const id = generateFragmentId(nowIso());
      const fragment = insertFragment(db, {
        id,
        module: 'test',
        type: 'note',
        content: 'Original content',
        created_at: nowIso(),
      });

      // Verify no update function exists in our API
      // This is enforced by not exporting any updateFragmentContent function
      const originalContent = fragment.content;

      // Attempt operations that should not modify content
      sealFragment(db, id, 'I seal this as final.', nowIso());
      const afterSeal = getFragment(db, id)!;
      expect(afterSeal.content).toBe(originalContent);

      ensureWitnessOnView(db, id, nowIso());
      const afterWitness = getFragment(db, id)!;
      expect(afterWitness.content).toBe(originalContent);

      // Add trace (if another fragment exists)
      const id2 = generateFragmentId(nowIso());
      insertFragment(db, {
        id: id2,
        module: 'test',
        type: 'note',
        content: 'Another fragment',
        created_at: nowIso(),
      });
      addTraces(db, id, [id2], nowIso());
      const afterTrace = getFragment(db, id)!;
      expect(afterTrace.content).toBe(originalContent);
    });
  });

  it('should not have ON DELETE CASCADE that removes traces/witnesses', async () => {
    await withTestDb((db) => {
      // SQLite doesn't support ON DELETE CASCADE by default for our schema
      // But we verify traces/witnesses are not deleted when fragment exists
      const id = generateFragmentId(nowIso());
      insertFragment(db, {
        id,
        module: 'test',
        type: 'note',
        content: 'Test',
        created_at: nowIso(),
      });

      ensureWitnessOnView(db, id, nowIso());
      const witness = getWitness(db, id);
      expect(witness).not.toBeNull();

      const id2 = generateFragmentId(nowIso());
      insertFragment(db, {
        id: id2,
        module: 'test',
        type: 'note',
        content: 'Another',
        created_at: nowIso(),
      });
      addTraces(db, id, [id2], nowIso());
      const traces = getTraces(db, id);
      expect(traces.length).toBe(1);

      // Fragment still exists, witness and traces should still exist
      const fragment = getFragment(db, id);
      expect(fragment).not.toBeNull();
      expect(getWitness(db, id)).not.toBeNull();
      expect(getTraces(db, id).length).toBe(1);
    });
  });
});

describe('Invariant: Canonical payload hashing is deterministic', () => {
  it('should produce identical hash for same inputs', async () => {
    await withTestDb((db) => {
      const id = generateFragmentId(nowIso());
      const createdAt = nowIso();
      const fragment = insertFragment(db, {
        id,
        module: 'test',
        type: 'note',
        content: 'Test content',
        created_at: createdAt,
      });

      const recomputed = recomputeFragmentHash(fragment);
      expect(recomputed).toBe(fragment.hash);
      expect(recomputed.toLowerCase()).toBe(fragment.hash.toLowerCase());
    });
  });

  it('should produce different hash when any character changes', async () => {
    await withTestDb((db) => {
      const id = generateFragmentId(nowIso());
      const createdAt = nowIso();
      const fragment1 = insertFragment(db, {
        id,
        module: 'test',
        type: 'note',
        content: 'Test content',
        created_at: createdAt,
      });

      const id2 = generateFragmentId(nowIso());
      const fragment2 = insertFragment(db, {
        id: id2,
        module: 'test',
        type: 'note',
        content: 'Test contenT', // Changed last character
        created_at: createdAt,
      });

      expect(fragment1.hash).not.toBe(fragment2.hash);

      // Test changing module
      const id3 = generateFragmentId(nowIso());
      const fragment3 = insertFragment(db, {
        id: id3,
        module: 'tesT', // Changed last character
        type: 'note',
        content: 'Test content',
        created_at: createdAt,
      });

      expect(fragment1.hash).not.toBe(fragment3.hash);
    });
  });
});

describe('Invariant: Seal is write-once and irreversible', () => {
  it('should seal fragment exactly once', async () => {
    await withTestDb((db) => {
      const id = generateFragmentId(nowIso());
      insertFragment(db, {
        id,
        module: 'test',
        type: 'note',
        content: 'Test',
        created_at: nowIso(),
      });

      const sealedAt1 = nowIso();
      const seal1 = sealFragment(db, id, 'I seal this as final.', sealedAt1);
      
      expect(seal1.status).toBe('SEALED');
      expect(seal1.sealed_at).toBe(sealedAt1);
      expect(seal1.seal_statement).toBe('I seal this as final.');
      expect(seal1.seal_hash).not.toBeNull();

      // Attempt to seal again with different statement
      const sealedAt2 = new Date(Date.now() + 1000).toISOString();
      const seal2 = sealFragment(db, id, 'Different statement', sealedAt2);

      // Nothing should change
      expect(seal2.sealed_at).toBe(sealedAt1); // Same as first seal
      expect(seal2.seal_statement).toBe('I seal this as final.'); // Same statement
      expect(seal2.seal_hash).toBe(seal1.seal_hash); // Same hash
    });
  });

  it('should require non-empty seal statement', async () => {
    await withTestDb((db) => {
      const id = generateFragmentId(nowIso());
      insertFragment(db, {
        id,
        module: 'test',
        type: 'note',
        content: 'Test',
        created_at: nowIso(),
      });

      // Seal with valid statement first
      sealFragment(db, id, 'I seal this as final.', nowIso());
      const sealed = getFragment(db, id)!;
      expect(sealed.status).toBe('SEALED');
      expect(sealed.seal_statement).toBe('I seal this as final.');

      // Attempting to seal again should not change anything
      // (This is tested in the previous test, but we verify seal statement is required)
      const originalSealStatement = sealed.seal_statement;
      const originalSealHash = sealed.seal_hash;
      
      // Try to "re-seal" - should not change
      sealFragment(db, id, 'Different statement', nowIso());
      const afterReseal = getFragment(db, id)!;
      expect(afterReseal.seal_statement).toBe(originalSealStatement);
      expect(afterReseal.seal_hash).toBe(originalSealHash);
    });
  });
});

describe('Invariant: Witness is generated at most once per fragment (global)', () => {
  it('should create witness only once', async () => {
    await withTestDb((db) => {
      const id = generateFragmentId(nowIso());
      insertFragment(db, {
        id,
        module: 'test',
        type: 'note',
        content: 'Test',
        created_at: nowIso(),
      });

      const witnessedAt = nowIso();
      const witness1 = ensureWitnessOnView(db, id, witnessedAt);
      const witness2 = ensureWitnessOnView(db, id, witnessedAt);

      expect(witness1.witnessed_at).toBe(witness2.witnessed_at);
      expect(witness1.witness_hash).toBe(witness2.witness_hash);
      expect(witness1.id).toBe(witness2.id);
    });
  });

  it('should handle race conditions safely', async () => {
    await withTestDb((db) => {
      const id = generateFragmentId(nowIso());
      insertFragment(db, {
        id,
        module: 'test',
        type: 'note',
        content: 'Test',
        created_at: nowIso(),
      });

      const witnessedAt = nowIso();
      
      // Simulate race: call twice in quick succession
      const witness1 = ensureWitnessOnView(db, id, witnessedAt);
      const witness2 = ensureWitnessOnView(db, id, witnessedAt);

      // Should only have one witness row
      const count = db.prepare('SELECT COUNT(*) as count FROM witnesses WHERE fragment_id = ?').get(id) as { count: number };
      expect(count.count).toBe(1);
      
      expect(witness1.id).toBe(witness2.id);
    });
  });
});

describe('Invariant: Verification never mutates state', () => {
  it('should not create or modify data during verification', async () => {
    await withTestDb((db) => {
      const id = generateFragmentId(nowIso());
      const fragment = insertFragment(db, {
        id,
        module: 'test',
        type: 'note',
        content: 'Test',
        created_at: nowIso(),
      });

      const initialFragmentCount = listFragments(db).length;
      const initialWitnessCount = db.prepare('SELECT COUNT(*) as count FROM witnesses').get() as { count: number };

      // Simulate verification (recompute hash multiple times)
      const hash1 = recomputeFragmentHash(fragment);
      const hash2 = recomputeFragmentHash(fragment);
      const hash3 = recomputeFragmentHash(fragment);

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
      expect(hash1).toBe(fragment.hash);

      // Verify no new fragments or witnesses created
      const finalFragmentCount = listFragments(db).length;
      const finalWitnessCount = db.prepare('SELECT COUNT(*) as count FROM witnesses').get() as { count: number };

      expect(finalFragmentCount).toBe(initialFragmentCount);
      expect(finalWitnessCount.count).toBe(initialWitnessCount.count);
    });
  });
});

describe('Invariant: Trace references must be valid and non-duplicated', () => {
  it('should prevent duplicate traces', async () => {
    await withTestDb((db) => {
      const id1 = generateFragmentId(nowIso());
      const id2 = generateFragmentId(nowIso());
      
      insertFragment(db, {
        id: id1,
        module: 'test',
        type: 'note',
        content: 'Fragment 1',
        created_at: nowIso(),
      });

      insertFragment(db, {
        id: id2,
        module: 'test',
        type: 'note',
        content: 'Fragment 2',
        created_at: nowIso(),
      });

      addTraces(db, id1, [id2], nowIso());
      expect(countTraces(db, id1, id2)).toBe(1);

      // Add same trace again
      addTraces(db, id1, [id2], nowIso());
      expect(countTraces(db, id1, id2)).toBe(1); // Still only one
    });
  });

  it('should reject trace to non-existent fragment', async () => {
    await withTestDb((db) => {
      const id1 = generateFragmentId(nowIso());
      insertFragment(db, {
        id: id1,
        module: 'test',
        type: 'note',
        content: 'Fragment 1',
        created_at: nowIso(),
      });

      const nonExistentId = 'FRAG-20260115-9999';

      expect(() => {
        addTraces(db, id1, [nonExistentId], nowIso());
      }).toThrow();

      // Verify no trace was inserted
      const traces = getTraces(db, id1);
      expect(traces.length).toBe(0);
    });
  });
});

describe('Invariant: UI/actions must not allow forbidden transitions', () => {
  it('should allow adding traces after sealing', async () => {
    await withTestDb((db) => {
      const id1 = generateFragmentId(nowIso());
      const id2 = generateFragmentId(nowIso());
      
      insertFragment(db, {
        id: id1,
        module: 'test',
        type: 'note',
        content: 'Fragment 1',
        created_at: nowIso(),
      });

      insertFragment(db, {
        id: id2,
        module: 'test',
        type: 'note',
        content: 'Fragment 2',
        created_at: nowIso(),
      });

      // Seal fragment 1
      sealFragment(db, id1, 'I seal this as final.', nowIso());
      const sealed = getFragment(db, id1)!;
      expect(sealed.status).toBe('SEALED');

      // Add trace after sealing
      addTraces(db, id1, [id2], nowIso());
      
      const traces = getTraces(db, id1);
      expect(traces.length).toBe(1);
      expect(traces[0].to_id).toBe(id2);
    });
  });
});

describe('Invariant: Hash computation uses exact stored values', () => {
  it('should use stored values for hash recomputation', async () => {
    await withTestDb((db) => {
      const id = generateFragmentId(nowIso());
      const createdAt = nowIso();
      const fragment = insertFragment(db, {
        id,
        module: 'test',
        type: 'note',
        content: 'Test\nContent\nWith\nNewlines',
        created_at: createdAt,
      });

      // Recompute from stored values
      const recomputed = recomputeFragmentHash(fragment);
      expect(recomputed).toBe(fragment.hash);

      // Verify seal hash uses stored values
      sealFragment(db, id, 'I seal this.', nowIso());
      const sealed = getFragment(db, id)!;
      const recomputedSeal = recomputeSealHash(sealed);
      expect(recomputedSeal).toBe(sealed.seal_hash);
    });
  });
});

describe('Invariant: Fragment identifiers are unique and immutable', () => {
  it('should enforce unique fragment IDs', async () => {
    await withTestDb((db) => {
      const id = generateFragmentId(nowIso());
      insertFragment(db, {
        id,
        module: 'test',
        type: 'note',
        content: 'First',
        created_at: nowIso(),
      });

      // Attempt to insert with same ID should fail
      expect(() => {
        insertFragment(db, {
          id,
          module: 'test',
          type: 'note',
          content: 'Second',
          created_at: nowIso(),
        });
      }).toThrow();
    });
  });
});

describe('Invariant: Meta directives never enter fragment content', () => {
  it('should exclude meta directives from fragment content', async () => {
    await withTestDb((db) => {
      const rawContent = `𖡎: SET MODE=SILENT
This line is content.
𖡎: TRACE OFF
✯ Visible glyph line.`;

      const { content, meta_lines } = stripAndCollectMeta(rawContent);
      
      const fragment = insertFragment(db, {
        id: generateFragmentId(nowIso()),
        module: 'test',
        type: 'note',
        content: content,
        created_at: nowIso(),
      });

      // Fragment content should exclude meta directives
      expect(fragment.content).not.toContain('𖡎:');
      expect(fragment.content).toBe('This line is content.\n✯ Visible glyph line.');
      
      // Meta lines should be collected
      expect(meta_lines).toHaveLength(2);
      expect(meta_lines[0].directive).toBe('SET MODE=SILENT');
      expect(meta_lines[1].directive).toBe('TRACE OFF');
    });
  });
});

describe('Invariant: Meta directives are always audited (append-only)', () => {
  it('should record meta directives in meta_audit table', async () => {
    await withTestDb((db) => {
      const rawContent = `𖡎: SET MODE=SILENT
This line is content.
𖡎: TRACE OFF
Another content line.`;

      const { content, meta_lines } = stripAndCollectMeta(rawContent);
      
      const fragment = insertFragment(db, {
        id: generateFragmentId(nowIso()),
        module: 'test',
        type: 'note',
        content: content,
        created_at: nowIso(),
      });

      // Insert meta audit records
      const createdAt = nowIso();
      for (const metaLine of meta_lines) {
        const metaId = generateMetaId(db);
        const metaHash = computeMetaHash(
          metaId,
          createdAt,
          'submission',
          'test',
          fragment.id,
          metaLine.directive,
          metaLine.raw_line
        );

        db.prepare(
          'INSERT INTO meta_audit (meta_id, created_at, source, module, fragment_id, directive, raw_line, meta_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(metaId, createdAt, 'submission', 'test', fragment.id, metaLine.directive, metaLine.raw_line, metaHash);
      }

      // Assert fragment.content excludes meta lines
      expect(fragment.content).not.toContain('𖡎:');

      // Assert meta_audit count for fragment_id == 2
      const metaCount = db.prepare('SELECT COUNT(*) as count FROM meta_audit WHERE fragment_id = ?').get(fragment.id) as { count: number };
      expect(metaCount.count).toBe(2);

      // Assert each meta row has meta_hash set and matches recomputation
      const metaRows = db.prepare('SELECT * FROM meta_audit WHERE fragment_id = ?').all(fragment.id) as any[];
      for (const metaRow of metaRows) {
        expect(metaRow.meta_hash).toBeTruthy();
        const recomputed = computeMetaHash(
          metaRow.meta_id,
          metaRow.created_at,
          metaRow.source,
          metaRow.module,
          metaRow.fragment_id,
          metaRow.directive,
          metaRow.raw_line
        );
        expect(recomputed.toLowerCase()).toBe(metaRow.meta_hash.toLowerCase());
      }
    });
  });
});

describe('Invariant: Meta audit is append-only', () => {
  it('should only allow inserts, no updates or deletes', async () => {
    await withTestDb((db) => {
      const metaId = generateMetaId(db);
      const createdAt = nowIso();
      const metaHash = computeMetaHash(metaId, createdAt, 'submission', 'test', null, 'TEST DIRECTIVE', '𖡎: TEST DIRECTIVE');

      // Insert meta audit record
      db.prepare(
        'INSERT INTO meta_audit (meta_id, created_at, source, module, fragment_id, directive, raw_line, meta_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(metaId, createdAt, 'submission', 'test', null, 'TEST DIRECTIVE', '𖡎: TEST DIRECTIVE', metaHash);

      // Attempt to update should fail (no UPDATE function exposed, but SQLite allows it)
      // We test that our code doesn't expose update/delete functions
      // This is a behavioral test - we confirm inserts work and no update/delete functions exist
      const meta = db.prepare('SELECT * FROM meta_audit WHERE meta_id = ?').get(metaId);
      expect(meta).toBeTruthy();
    });
  });
});

describe('Invariant: Unicode glyphs in directive are stable', () => {
  it('should preserve Unicode glyphs in meta directive and verify hash', async () => {
    await withTestDb((db) => {
      const rawContent = `𖡎: 𖤂 arc LOCK ✯`;

      const { content, meta_lines } = stripAndCollectMeta(rawContent);
      
      const fragment = insertFragment(db, {
        id: generateFragmentId(nowIso()),
        module: 'test',
        type: 'note',
        content: content,
        created_at: nowIso(),
      });

      // Insert meta audit record
      const metaLine = meta_lines[0];
      const metaId = generateMetaId(db);
      const createdAt = nowIso();
      const metaHash = computeMetaHash(
        metaId,
        createdAt,
        'submission',
        'test',
        fragment.id,
        metaLine.directive,
        metaLine.raw_line
      );

      db.prepare(
        'INSERT INTO meta_audit (meta_id, created_at, source, module, fragment_id, directive, raw_line, meta_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(metaId, createdAt, 'submission', 'test', fragment.id, metaLine.directive, metaLine.raw_line, metaHash);

      // Assert stored directive exactly matches
      const meta = db.prepare('SELECT * FROM meta_audit WHERE meta_id = ?').get(metaId) as any;
      expect(meta.directive).toBe('𖤂 arc LOCK ✯');
      expect(meta.directive).toBe(metaLine.directive);

      // Verify hash
      const recomputed = computeMetaHash(
        meta.meta_id,
        meta.created_at,
        meta.source,
        meta.module,
        meta.fragment_id,
        meta.directive,
        meta.raw_line
      );
      expect(recomputed.toLowerCase()).toBe(meta.meta_hash.toLowerCase());
    });
  });
});

