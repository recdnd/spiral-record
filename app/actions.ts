'use server';

import { getDb } from '@/lib/db';
import {
  generateFragmentId,
  normalizeModule,
  normalizeType,
  normalizeContent,
  validateContent,
  normalizeFragmentIds,
  computeHash,
  validateFragmentId,
  computeSealHash,
} from '@/lib/utils';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function createFragment(formData: FormData) {
  const module = normalizeModule(formData.get('module')?.toString() || 'anon');
  const type = normalizeType(formData.get('type')?.toString() || 'note');
  const content = normalizeContent(formData.get('content')?.toString() || '');
  const traceIds = normalizeFragmentIds(formData.get('traces')?.toString() || '');

  const validation = validateContent(content);
  if (!validation.valid) {
    return { error: validation.error };
  }

  const db = getDb();
  const id = generateFragmentId(db);
  const created_at = new Date().toISOString();
  const hash = computeHash(id, created_at, module, type, content);

  try {
    db.transaction(() => {
      // Insert fragment
      db.prepare(
        'INSERT INTO fragments (id, module, type, content, created_at, status, sealed_at, hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(id, module, type, content, created_at, 'ACTIVE', null, hash);

      // Insert traces if any
      if (traceIds.length > 0) {
        const insertTrace = db.prepare(
          'INSERT INTO traces (from_id, to_id, created_at) VALUES (?, ?, ?)'
        );
        
        for (const toId of traceIds) {
          // Validate that target fragment exists
          const target = db.prepare('SELECT id FROM fragments WHERE id = ?').get(toId);
          if (!target) {
            throw new Error(`Fragment ${toId} does not exist`);
          }
          // Prevent duplicate traces
          const existing = db
            .prepare('SELECT id FROM traces WHERE from_id = ? AND to_id = ?')
            .get(id, toId);
          if (!existing) {
            insertTrace.run(id, toId, created_at);
          }
        }
      }
    })();

    revalidatePath('/feed');
    redirect(`/f/${id}?recorded=true`);
  } catch (error: any) {
    return { error: error.message || 'Failed to create fragment' };
  }
}

export async function sealFragment(id: string, formData: FormData) {
  const db = getDb();
  const fragment = db.prepare('SELECT * FROM fragments WHERE id = ?').get(id) as any;

  if (!fragment) {
    return { error: 'Fragment not found' };
  }

  if (fragment.status === 'SEALED') {
    return { error: 'Already sealed (write-once).' };
  }

  const seal_statement_raw = formData.get('seal_statement')?.toString() || '';
  const seal_statement = seal_statement_raw.trim();

  // Validate seal statement
  if (seal_statement.length === 0) {
    return { error: 'Seal statement cannot be empty' };
  }

  if (seal_statement.length > 140) {
    return { error: 'Seal statement must not exceed 140 characters' };
  }

  const sealed_at = new Date().toISOString();
  const seal_hash = computeSealHash(id, sealed_at, fragment.hash, seal_statement);

  // Update fragment with seal information
  db.prepare(
    'UPDATE fragments SET status = ?, sealed_at = ?, seal_statement = ?, seal_hash = ? WHERE id = ?'
  ).run('SEALED', sealed_at, seal_statement, seal_hash, id);

  revalidatePath(`/f/${id}`);
  revalidatePath('/feed');
  return { success: true, message: 'Fragment sealed' };
}

export async function addTraces(fromId: string, traceIds: string[]) {
  const db = getDb();
  
  // Validate fragment exists
  const fragment = db.prepare('SELECT id FROM fragments WHERE id = ?').get(fromId);
  if (!fragment) {
    return { error: 'Fragment not found' };
  }

  const normalizedIds = traceIds
    .map(id => id.trim().toUpperCase())
    .filter(id => validateFragmentId(id));

  if (normalizedIds.length === 0) {
    return { error: 'No valid fragment IDs provided' };
  }

  const created_at = new Date().toISOString();
  const insertTrace = db.prepare('INSERT INTO traces (from_id, to_id, created_at) VALUES (?, ?, ?)');
  const errors: string[] = [];
  const added: string[] = [];

  for (const toId of normalizedIds) {
    // Validate target exists
    const target = db.prepare('SELECT id FROM fragments WHERE id = ?').get(toId);
    if (!target) {
      errors.push(`Fragment ${toId} does not exist`);
      continue;
    }

    // Prevent duplicates
    const existing = db.prepare('SELECT id FROM traces WHERE from_id = ? AND to_id = ?').get(fromId, toId);
    if (existing) {
      errors.push(`Trace to ${toId} already exists`);
      continue;
    }

    insertTrace.run(fromId, toId, created_at);
    added.push(toId);
  }

  revalidatePath(`/f/${fromId}`);
  
  if (errors.length > 0 && added.length === 0) {
    return { error: errors.join('; ') };
  }

  return {
    success: true,
    added,
    errors: errors.length > 0 ? errors : undefined,
  };
}

