import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  generateFragmentId,
  generateMetaId,
  normalizeModule,
  normalizeType,
  stripAndCollectMeta,
  validateContent,
  normalizeFragmentIds,
  computeHash,
  computeMetaHash,
} from '@/lib/utils';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    const module = normalizeModule(formData.get('module')?.toString() || 'anon');
    const type = normalizeType(formData.get('type')?.toString() || 'note');
    const rawContent = formData.get('content')?.toString() || '';
    
    // Strip and collect meta directives
    const { content, meta_lines } = stripAndCollectMeta(rawContent);
    
    // Validate content (after meta stripping)
    const validation = validateContent(content);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const traceIds = normalizeFragmentIds(formData.get('traces')?.toString() || '');

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

        // Insert meta audit records for each meta directive
        if (meta_lines.length > 0) {
          const insertMeta = db.prepare(
            'INSERT INTO meta_audit (meta_id, created_at, source, module, fragment_id, directive, raw_line, meta_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          );

          for (const metaLine of meta_lines) {
            const metaId = generateMetaId(db);
            const metaHash = computeMetaHash(
              metaId,
              created_at,
              'submission',
              module,
              id,
              metaLine.directive,
              metaLine.raw_line
            );

            insertMeta.run(
              metaId,
              created_at,
              'submission',
              module,
              id,
              metaLine.directive,
              metaLine.raw_line,
              metaHash
            );
          }
        }
      })();

      revalidatePath('/feed');
      
      // Return JSON response instead of redirect
      // Client will handle navigation
      return NextResponse.json({ ok: true, id });
    } catch (error: any) {
      return NextResponse.json(
        { ok: false, error: error.message || 'Failed to create fragment' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Invalid request' },
      { status: 500 }
    );
  }
}

