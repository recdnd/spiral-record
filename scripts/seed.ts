import { getDb } from '../lib/db';
import { computeHash } from '../lib/utils';

const db = getDb();

// Clear existing data (optional, for clean seed)
db.exec('DELETE FROM traces');
db.exec('DELETE FROM fragments');

// Create sample fragments
const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

const fragments = [
  {
    id: 'FRAG-20260114-0001',
    module: 'anon',
    type: 'claim',
    content: 'This is a sample claim fragment. It demonstrates the immutable nature of the registry.',
    created_at: twoDaysAgo,
    status: 'ACTIVE',
    sealed_at: null,
  },
  {
    id: 'FRAG-20260114-0002',
    module: 'test',
    type: 'promise',
    content: 'I promise to maintain the integrity of this record system. No edits, no deletes.',
    created_at: yesterday,
    status: 'ACTIVE',
    sealed_at: null,
  },
  {
    id: 'FRAG-20260114-0003',
    module: 'anon',
    type: 'definition',
    content: 'Fragment: An immutable unit of recorded language. Once created, it can only be sealed or traced.',
    created_at: now,
    status: 'SEALED',
    sealed_at: now,
  },
];

// Insert fragments
const insertFragment = db.prepare(
  'INSERT INTO fragments (id, module, type, content, created_at, status, sealed_at, hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);

for (const frag of fragments) {
  const hash = computeHash(frag.id, frag.created_at, frag.module, frag.type, frag.content);
  insertFragment.run(
    frag.id,
    frag.module,
    frag.type,
    frag.content,
    frag.created_at,
    frag.status,
    frag.sealed_at,
    hash
  );
}

// Create traces
const insertTrace = db.prepare('INSERT INTO traces (from_id, to_id, created_at) VALUES (?, ?, ?)');

// Fragment 2 traces to fragment 1
insertTrace.run('FRAG-20260114-0002', 'FRAG-20260114-0001', yesterday);

// Fragment 3 traces to fragment 1 and 2
insertTrace.run('FRAG-20260114-0003', 'FRAG-20260114-0001', now);
insertTrace.run('FRAG-20260114-0003', 'FRAG-20260114-0002', now);

console.log('✓ Seeded database with 3 fragments and 3 traces');
console.log('  - FRAG-20260114-0001 (claim, ACTIVE)');
console.log('  - FRAG-20260114-0002 (promise, ACTIVE)');
console.log('  - FRAG-20260114-0003 (definition, SEALED)');

