import { describe, it, expect } from 'vitest';
import { withTestDb, nowIso, generateFragmentId } from './helpers';
import { insertFragment, getFragment, sealFragment, ensureWitnessOnView, getWitness, recomputeFragmentHash } from '../lib/db-testable';
import { buildCanonicalPayload, buildCanonicalSealPayload, buildCanonicalWitnessPayload } from '../lib/canonical';
import { parseCanonicalPayload, parseCanonicalSealPayload, parseCanonicalWitnessPayload, ParseError } from '../lib/canonical-parser';
import { createHash } from 'crypto';
import { stripMetaDirectives } from '../lib/utils';

describe('Invariant: Canonical payload textual format is stable', () => {
  it('should generate payload with exact format and order', async () => {
    await withTestDb((db) => {
      const id = generateFragmentId(nowIso());
      const createdAt = nowIso();
      const fragment = insertFragment(db, {
        id,
        module: 'test',
        type: 'claim',
        content: 'This is a test\nwith multiple\nlines.',
        created_at: createdAt,
      });

      const payload = buildCanonicalPayload(fragment);

      // Verify exact format
      const expected = `--- CANONICAL PAYLOAD ---
id: ${fragment.id}
created_at: ${fragment.created_at}
module: ${fragment.module}
type: ${fragment.type}
content:
${fragment.content}
--- END PAYLOAD ---`;

      expect(payload).toBe(expected);
    });
  });

  it('should preserve newlines and whitespace in content exactly', async () => {
    await withTestDb((db) => {
      const id = generateFragmentId(nowIso());
      const contentWithNewlines = 'line1\n\nline3\nline4';
      const fragment = insertFragment(db, {
        id,
        module: 'test',
        type: 'note',
        content: contentWithNewlines,
        created_at: nowIso(),
      });

      const payload = buildCanonicalPayload(fragment);

      // Extract content from payload
      const contentStart = payload.indexOf('content:') + 'content:'.length;
      const contentEnd = payload.indexOf('\n--- END PAYLOAD ---');
      const extractedContent = payload.slice(contentStart, contentEnd).trimStart();
      
      expect(extractedContent).toBe(contentWithNewlines);
      expect(extractedContent).toContain('\n\n'); // Double newline preserved
    });
  });

  it('should maintain field order: id, created_at, module, type, content', async () => {
    await withTestDb((db) => {
      const id = generateFragmentId(nowIso());
      const fragment = insertFragment(db, {
        id,
        module: 'test',
        type: 'note',
        content: 'Test',
        created_at: nowIso(),
      });

      const payload = buildCanonicalPayload(fragment);

      // Verify field order
      const idIndex = payload.indexOf('id:');
      const createdAtIndex = payload.indexOf('created_at:');
      const moduleIndex = payload.indexOf('module:');
      const typeIndex = payload.indexOf('type:');
      const contentIndex = payload.indexOf('content:');

      expect(idIndex).toBeLessThan(createdAtIndex);
      expect(createdAtIndex).toBeLessThan(moduleIndex);
      expect(moduleIndex).toBeLessThan(typeIndex);
      expect(typeIndex).toBeLessThan(contentIndex);
    });
  });

  it('should handle content with colons without breaking format', async () => {
    await withTestDb((db) => {
      const id = generateFragmentId(nowIso());
      const contentWithColon = 'note: test\nkey: value\nnormal line';
      const fragment = insertFragment(db, {
        id,
        module: 'test',
        type: 'note',
        content: contentWithColon,
        created_at: nowIso(),
      });

      const payload = buildCanonicalPayload(fragment);

      // Verify payload structure is intact
      expect(payload.startsWith('--- CANONICAL PAYLOAD ---')).toBe(true);
      expect(payload.endsWith('--- END PAYLOAD ---\n') || payload.endsWith('--- END PAYLOAD ---')).toBe(true);
      
      // Verify content is preserved
      const contentStart = payload.indexOf('content:') + 'content:'.length;
      const contentEnd = payload.indexOf('\n--- END PAYLOAD ---');
      const extractedContent = payload.slice(contentStart, contentEnd).trimStart();
      expect(extractedContent).toBe(contentWithColon);
      expect(extractedContent).toContain('note: test');
    });
  });

  it('should match exact expected format for complex content', async () => {
    await withTestDb((db) => {
      const id = 'FRAG-20260115-0001';
      const createdAt = '2026-01-15T00:00:00.000Z';
      const fragment = insertFragment(db, {
        id,
        module: 'test',
        type: 'claim',
        content: 'line1\n\nline3\nline4',
        created_at: createdAt,
      });

      const payload = buildCanonicalPayload(fragment);

      // Expected exact format
      const expected = `--- CANONICAL PAYLOAD ---
id: ${id}
created_at: ${createdAt}
module: test
type: claim
content:
line1

line3
line4
--- END PAYLOAD ---`;

      expect(payload).toBe(expected);
    });
  });

  it('should include exact header and footer lines', async () => {
    await withTestDb((db) => {
      const fragment = insertFragment(db, {
        id: generateFragmentId(nowIso()),
        module: 'test',
        type: 'note',
        content: 'Test',
        created_at: nowIso(),
      });

      const payload = buildCanonicalPayload(fragment);

      expect(payload).toContain('--- CANONICAL PAYLOAD ---');
      expect(payload).toContain('--- END PAYLOAD ---');
      
      // Verify header is first line
      expect(payload.trim().startsWith('--- CANONICAL PAYLOAD ---')).toBe(true);
      // Verify footer is last line
      expect(payload.trim().endsWith('--- END PAYLOAD ---')).toBe(true);
    });
  });

  it('should have content: line followed by newline then raw content', async () => {
    await withTestDb((db) => {
      const fragment = insertFragment(db, {
        id: generateFragmentId(nowIso()),
        module: 'test',
        type: 'note',
        content: 'Test content',
        created_at: nowIso(),
      });

      const payload = buildCanonicalPayload(fragment);

      const contentLineIndex = payload.indexOf('content:');
      const afterContentLine = payload.slice(contentLineIndex + 'content:'.length);
      const footerIndex = afterContentLine.indexOf('\n--- END PAYLOAD ---');
      const contentOnly = afterContentLine.slice(0, footerIndex);
      
      // Should start with newline
      expect(contentOnly[0]).toBe('\n');
      // Then raw content (trim to remove the leading newline)
      expect(contentOnly.slice(1)).toBe('Test content');
    });
  });
});

describe('Invariant: Hash recomputation from canonical payload fields matches stored hash', () => {
  it('should match stored hash when recomputed from canonical order', async () => {
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
      expect(recomputed.toLowerCase()).toBe(fragment.hash.toLowerCase());
    });
  });

  it('should match after parsing payload and recomputing', async () => {
    await withTestDb((db) => {
      const fragment = insertFragment(db, {
        id: generateFragmentId(nowIso()),
        module: 'test',
        type: 'note',
        content: 'Test\ncontent\nwith\nnewlines',
        created_at: nowIso(),
      });

      const payload = buildCanonicalPayload(fragment);
      const parsed = parseCanonicalPayload(payload);
      
      expect(parsed).not.toBeNull();
      if (parsed) {
        const recomputed = recomputeFragmentHash({
          ...fragment,
          id: parsed.id,
          created_at: parsed.created_at,
          module: parsed.module,
          type: parsed.type,
          content: parsed.content,
        });
        expect(recomputed.toLowerCase()).toBe(fragment.hash.toLowerCase());
      }
    });
  });
});

describe('Invariant: Canonical seal payload format is stable', () => {
  it('should generate seal payload with exact format', async () => {
    await withTestDb((db) => {
      const id = generateFragmentId(nowIso());
      const sealedAt = nowIso();
      const fragment = insertFragment(db, {
        id,
        module: 'test',
        type: 'note',
        content: 'Test',
        created_at: nowIso(),
      });

      sealFragment(db, id, 'I seal this as final.', sealedAt);
      const sealed = getFragment(db, id)!;

      const payload = buildCanonicalSealPayload(sealed);

      const expected = `--- SEAL STATEMENT ---
fragment_id: ${sealed.id}
sealed_at: ${sealed.sealed_at}
fragment_hash: ${sealed.hash}
seal_statement: ${sealed.seal_statement}
--- END SEAL ---`;

      expect(payload).toBe(expected);
    });
  });
});

describe('Invariant: Canonical witness payload format is stable', () => {
  it('should generate witness payload with exact format', async () => {
    await withTestDb((db) => {
      const id = generateFragmentId(nowIso());
      const witnessedAt = nowIso();
      insertFragment(db, {
        id,
        module: 'test',
        type: 'note',
        content: 'Test',
        created_at: nowIso(),
      });

      ensureWitnessOnView(db, id, witnessedAt);
      const witness = getWitness(db, id)!;

      const payload = buildCanonicalWitnessPayload(witness);

      const expected = `--- WITNESS RECORD ---
fragment_id: ${witness.fragment_id}
witnessed_at: ${witness.witnessed_at}
fragment_hash: ${witness.fragment_hash}
--- END WITNESS ---`;

      expect(payload).toBe(expected);
    });
  });
});

describe('Invariant: buildCanonicalPayload -> parseCanonicalPayload is lossless', () => {
  it('should preserve all fields exactly through round-trip', async () => {
    await withTestDb((db) => {
      // Use tricky content with colons, blank lines, indentation
      const trickyContent = 'line1: alpha\n\n  indented line\nline4 with colon: beta\n';
      const fragment = insertFragment(db, {
        id: generateFragmentId(nowIso()),
        module: 'test',
        type: 'note',
        content: trickyContent,
        created_at: nowIso(),
      });

      const payload = buildCanonicalPayload(fragment);
      const parsed = parseCanonicalPayload(payload);

      // Exact equality for all fields
      expect(parsed.id).toBe(fragment.id);
      expect(parsed.created_at).toBe(fragment.created_at);
      expect(parsed.module).toBe(fragment.module);
      expect(parsed.type).toBe(fragment.type);
      expect(parsed.content).toBe(fragment.content);
      expect(parsed.content).toBe(trickyContent);
    });
  });

  it('should handle Unicode glyphs in content', async () => {
    await withTestDb((db) => {
      const unicodeContent = 'Content with ✞ and 𖡎 glyphs\nand normal text';
      const fragment = insertFragment(db, {
        id: generateFragmentId(nowIso()),
        module: 'test',
        type: 'note',
        content: unicodeContent,
        created_at: nowIso(),
      });

      const payload = buildCanonicalPayload(fragment);
      const parsed = parseCanonicalPayload(payload);

      expect(parsed.content).toBe(unicodeContent);
      expect(parsed.content).toBe(fragment.content);

      // Verify hash consistency with Unicode
      const recomputed = recomputeFragmentHash({
        ...fragment,
        id: parsed.id,
        created_at: parsed.created_at,
        module: parsed.module,
        type: parsed.type,
        content: parsed.content,
      });
      expect(recomputed.toLowerCase()).toBe(fragment.hash.toLowerCase());
    });
  });
});

describe('Invariant: Hash computed from parsed payload equals stored hash', () => {
  it('should match hash when computed from parsed values', async () => {
    await withTestDb((db) => {
      const fragment = insertFragment(db, {
        id: generateFragmentId(nowIso()),
        module: 'test',
        type: 'note',
        content: 'Test content',
        created_at: nowIso(),
      });

      const payload = buildCanonicalPayload(fragment);
      const parsed = parseCanonicalPayload(payload);

      // Compute hash using canonical order from parsed values
      const canonicalString = `${parsed.id}|${parsed.created_at}|${parsed.module}|${parsed.type}|${parsed.content}`;
      const computed = createHash('sha256').update(canonicalString).digest('hex');

      expect(computed.toLowerCase()).toBe(fragment.hash.toLowerCase());
    });
  });
});

describe('Invariant: Parser rejects malformed payloads', () => {
  it('should throw on missing header', () => {
    const malformed = `id: FRAG-20260115-0001
created_at: 2026-01-15T00:00:00Z
module: test
type: note
content:
Test
--- END PAYLOAD ---`;

    expect(() => parseCanonicalPayload(malformed)).toThrow(ParseError);
    expect(() => parseCanonicalPayload(malformed)).toThrow('Missing header');
  });

  it('should throw on missing footer', () => {
    const malformed = `--- CANONICAL PAYLOAD ---
id: FRAG-20260115-0001
created_at: 2026-01-15T00:00:00Z
module: test
type: note
content:
Test`;

    expect(() => parseCanonicalPayload(malformed)).toThrow(ParseError);
    expect(() => parseCanonicalPayload(malformed)).toThrow('Missing footer');
  });

  it('should throw on wrong field order', () => {
    const malformed = `--- CANONICAL PAYLOAD ---
id: FRAG-20260115-0001
created_at: 2026-01-15T00:00:00Z
type: note
module: test
content:
Test
--- END PAYLOAD ---`;

    expect(() => parseCanonicalPayload(malformed)).toThrow(ParseError);
    expect(() => parseCanonicalPayload(malformed)).toThrow('Fields out of order');
  });
});

describe('Round-trip: Build → Parse → Hash consistency', () => {
  it('should maintain hash consistency through build-parse round-trip', async () => {
    await withTestDb((db) => {
      const fragment = insertFragment(db, {
        id: generateFragmentId(nowIso()),
        module: 'test',
        type: 'note',
        content: 'Complex content\nwith: colons\nand\n\nmultiple\nlines',
        created_at: nowIso(),
      });

      // Build payload
      const payload = buildCanonicalPayload(fragment);
      
      // Parse payload
      const parsed = parseCanonicalPayload(payload);
      
      // Recompute hash from parsed values
      const recomputed = recomputeFragmentHash({
        ...fragment,
        id: parsed.id,
        created_at: parsed.created_at,
        module: parsed.module,
        type: parsed.type,
        content: parsed.content,
      });
      
      // Should match original hash
      expect(recomputed.toLowerCase()).toBe(fragment.hash.toLowerCase());
      
      // Verify all fields match exactly
      expect(parsed.id).toBe(fragment.id);
      expect(parsed.created_at).toBe(fragment.created_at);
      expect(parsed.module).toBe(fragment.module);
      expect(parsed.type).toBe(fragment.type);
      expect(parsed.content).toBe(fragment.content);
    });
  });

  it('should handle edge cases in round-trip', async () => {
    await withTestDb((db) => {
      const testCases = [
        'Simple content',
        'Content\nwith\nnewlines',
        'Content\n\nwith\n\n\nmultiple\n\nnewlines',
        'Content: with colon',
        'Content\nwith: colon\non: multiple\nlines:',
        'Content with trailing spaces   ',
        '',
      ];

      for (const content of testCases) {
        const fragment = insertFragment(db, {
          id: generateFragmentId(nowIso()),
          module: 'test',
          type: 'note',
          content: content,
          created_at: nowIso(),
        });

        const payload = buildCanonicalPayload(fragment);
        const parsed = parseCanonicalPayload(payload);
        
        expect(parsed.content).toBe(fragment.content);
        
        const recomputed = recomputeFragmentHash({
          ...fragment,
          id: parsed.id,
          created_at: parsed.created_at,
          module: parsed.module,
          type: parsed.type,
          content: parsed.content,
        });
        expect(recomputed.toLowerCase()).toBe(fragment.hash.toLowerCase());
      }
    });
  });
});

describe('Round-trip: Seal payload', () => {
  it('should maintain seal hash consistency through build-parse round-trip', async () => {
    await withTestDb((db) => {
      const id = generateFragmentId(nowIso());
      const sealedAt = nowIso();
      insertFragment(db, {
        id,
        module: 'test',
        type: 'note',
        content: 'Test',
        created_at: nowIso(),
      });

      sealFragment(db, id, 'I seal this as final.', sealedAt);
      const sealed = getFragment(db, id)!;

      const payload = buildCanonicalSealPayload(sealed);
      const parsed = parseCanonicalSealPayload(payload);

      // Recompute seal hash from parsed values
      const canonicalString = `${parsed.fragment_id}|${parsed.sealed_at}|${parsed.fragment_hash}|${parsed.seal_statement}`;
      const recomputed = createHash('sha256').update(canonicalString).digest('hex');

      expect(recomputed.toLowerCase()).toBe(sealed.seal_hash!.toLowerCase());
      
      // Verify all fields match
      expect(parsed.fragment_id).toBe(sealed.id);
      expect(parsed.sealed_at).toBe(sealed.sealed_at);
      expect(parsed.fragment_hash).toBe(sealed.hash);
      expect(parsed.seal_statement).toBe(sealed.seal_statement);
    });
  });
});

describe('Round-trip: Witness payload', () => {
  it('should maintain witness hash consistency through build-parse round-trip', async () => {
    await withTestDb((db) => {
      const id = generateFragmentId(nowIso());
      const witnessedAt = nowIso();
      insertFragment(db, {
        id,
        module: 'test',
        type: 'note',
        content: 'Test',
        created_at: nowIso(),
      });

      ensureWitnessOnView(db, id, witnessedAt);
      const witness = getWitness(db, id)!;

      const payload = buildCanonicalWitnessPayload(witness);
      const parsed = parseCanonicalWitnessPayload(payload);

      // Recompute witness hash from parsed values
      const canonicalString = `${parsed.fragment_id}|${parsed.witnessed_at}|${parsed.fragment_hash}`;
      const recomputed = createHash('sha256').update(canonicalString).digest('hex');

      expect(recomputed.toLowerCase()).toBe(witness.witness_hash.toLowerCase());
      
      // Verify all fields match
      expect(parsed.fragment_id).toBe(witness.fragment_id);
      expect(parsed.witnessed_at).toBe(witness.witnessed_at);
      expect(parsed.fragment_hash).toBe(witness.fragment_hash);
    });
  });
});

describe('Unicode Glyph Integrity & Meta-Language Exclusion', () => {
  describe('Invariant: Unicode glyphs in content are preserved byte-for-byte', () => {
    it('should preserve Unicode glyphs exactly through storage and round-trip', async () => {
      await withTestDb((db) => {
        const unicodeContent = `✯ Flamemark holders:
𝓡 rec
𝘔 mat
⭒ sus
𝙂 gas
𖤂 arc
End.`;

        const fragment = insertFragment(db, {
          id: generateFragmentId(nowIso()),
          module: 'test',
          type: 'note',
          content: unicodeContent,
          created_at: nowIso(),
        });

        // Assert fragment.content === EXACT original string
        expect(fragment.content).toBe(unicodeContent);

        // Build canonical payload
        const payload = buildCanonicalPayload(fragment);
        
        // Parse canonical payload
        const parsed = parseCanonicalPayload(payload);
        
        // Assert parsed.content === EXACT original string
        expect(parsed.content).toBe(unicodeContent);
        expect(parsed.content).toBe(fragment.content);

        // Recompute hash and assert it matches stored fragment.hash
        const recomputed = recomputeFragmentHash({
          ...fragment,
          id: parsed.id,
          created_at: parsed.created_at,
          module: parsed.module,
          type: parsed.type,
          content: parsed.content,
        });
        expect(recomputed.toLowerCase()).toBe(fragment.hash.toLowerCase());
      });
    });
  });

  describe('Invariant: Meta directives (𖡎:) never enter fragment content', () => {
    it('should strip meta directives before storage', async () => {
      await withTestDb((db) => {
        const rawContent = `𖡎: SET MODE=SILENT
This line is content.
𖡎: TRACE OFF
✯ Visible glyph line.`;

        const expectedContent = `This line is content.
✯ Visible glyph line.`;

        // Strip meta directives before insertion
        const strippedContent = stripMetaDirectives(rawContent);
        
        const fragment = insertFragment(db, {
          id: generateFragmentId(nowIso()),
          module: 'test',
          type: 'note',
          content: strippedContent,
          created_at: nowIso(),
        });

        // Assert fragment.content === expected string (no meta directives)
        expect(fragment.content).toBe(expectedContent);
        
        // Assert fragment.content does NOT contain "𖡎:"
        expect(fragment.content).not.toContain('𖡎:');

        // Build canonical payload
        const payload = buildCanonicalPayload(fragment);
        
        // Assert payload does NOT contain "𖡎:"
        expect(payload).not.toContain('𖡎:');

        // Recompute hash and assert stable
        const recomputed = recomputeFragmentHash(fragment);
        expect(recomputed.toLowerCase()).toBe(fragment.hash.toLowerCase());
      });
    });

    it('should allow inline occurrences of 𖡎: (not at line start)', async () => {
      await withTestDb((db) => {
        const contentWithInline = `This is content with 𖡎: inline text.
Another line.`;

        const fragment = insertFragment(db, {
          id: generateFragmentId(nowIso()),
          module: 'test',
          type: 'note',
          content: contentWithInline,
          created_at: nowIso(),
        });

        // Inline occurrences should be preserved
        expect(fragment.content).toBe(contentWithInline);
        expect(fragment.content).toContain('𖡎:');
      });
    });
  });

  describe('Invariant: Removing meta directives does not cause hash ambiguity', () => {
    it('should produce identical hashes for meta-stripped equivalents', async () => {
      await withTestDb((db) => {
        const rawContentA = `𖡎: SET MODE=SILENT
This line is content.
𖡎: TRACE OFF
✯ Visible glyph line.`;

        const rawContentB = `This line is content.
✯ Visible glyph line.`;

        // Strip meta directives from A
        const strippedA = stripMetaDirectives(rawContentA);
        
        // Both should result in identical content
        expect(strippedA).toBe(rawContentB);

        const fragmentA = insertFragment(db, {
          id: generateFragmentId(nowIso()),
          module: 'test',
          type: 'note',
          content: strippedA,
          created_at: nowIso(),
        });

        const fragmentB = insertFragment(db, {
          id: generateFragmentId(nowIso()),
          module: 'test',
          type: 'note',
          content: rawContentB,
          created_at: nowIso(),
        });

        // Ensure stored fragment.content for A === fragment.content for B
        expect(fragmentA.content).toBe(fragmentB.content);

        // Assert fragment.hash for A === fragment.hash for B
        // (Note: They will have different IDs and created_at, so hashes will differ)
        // But if we use the same ID and created_at, hashes should match
        const sameId = generateFragmentId(nowIso());
        const sameCreatedAt = nowIso();

        const fragmentA2 = insertFragment(db, {
          id: sameId,
          module: 'test',
          type: 'note',
          content: strippedA,
          created_at: sameCreatedAt,
        });

        // Delete and re-insert with same ID/timestamp but different raw content
        db.prepare('DELETE FROM fragments WHERE id = ?').run(sameId);

        const fragmentB2 = insertFragment(db, {
          id: sameId,
          module: 'test',
          type: 'note',
          content: rawContentB,
          created_at: sameCreatedAt,
        });

        // Now hashes should match
        expect(fragmentA2.hash.toLowerCase()).toBe(fragmentB2.hash.toLowerCase());
      });
    });
  });

  describe('Invariant: /verify payload parser never accepts meta directives', () => {
    it('should reject canonical payload containing meta directives', () => {
      const payloadWithMeta = `--- CANONICAL PAYLOAD ---
id: FRAG-20260115-0001
created_at: 2026-01-15T00:00:00Z
module: test
type: note
content:
This is content.
𖡎: SET MODE=SILENT
More content.
--- END PAYLOAD ---`;

      expect(() => parseCanonicalPayload(payloadWithMeta)).toThrow(ParseError);
      expect(() => parseCanonicalPayload(payloadWithMeta)).toThrow('Meta directives are not allowed in canonical payload');
    });

    it('should accept inline occurrences of 𖡎: in content', () => {
      const payloadWithInline = `--- CANONICAL PAYLOAD ---
id: FRAG-20260115-0001
created_at: 2026-01-15T00:00:00Z
module: test
type: note
content:
This is content with 𖡎: inline text.
--- END PAYLOAD ---`;

      // Should not throw (inline is allowed)
      const parsed = parseCanonicalPayload(payloadWithInline);
      expect(parsed.content).toContain('𖡎:');
    });
  });
});
