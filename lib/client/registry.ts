// 瀏覽器內登記簿（IndexedDB）。「進入後建倉」：每個訪客的倉存在自己的瀏覽器持久層。
// 律法與伺服器版一致：NO EDIT / NO DELETE；唯二 mutation = seal（write-once）與 trace（append）。
// witness：閱即見證（first-witness，倉內一次性）。
import {
  ClientFragment,
  ClientTrace,
  ClientWitness,
  computeHash,
  computeSealHash,
  computeWitnessHash,
  generateFragmentId,
} from './integrity';

const DB_NAME = 'spiral-record';
const DB_VERSION = 1;

export type RegistryMeta = {
  key: 'registry';
  name: string;
  created_at: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('fragments')) {
        const s = db.createObjectStore('fragments', { keyPath: 'id' });
        s.createIndex('created_at', 'created_at');
      }
      if (!db.objectStoreNames.contains('traces')) {
        const s = db.createObjectStore('traces', { autoIncrement: true });
        s.createIndex('from_id', 'from_id');
        s.createIndex('to_id', 'to_id');
      }
      if (!db.objectStoreNames.contains('witnesses')) {
        db.createObjectStore('witnesses', { keyPath: 'fragment_id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  db: IDBDatabase,
  stores: string[],
  mode: IDBTransactionMode,
  fn: (t: IDBTransaction) => Promise<T> | T
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    let result: T;
    Promise.resolve(fn(t))
      .then((r) => (result = r))
      .catch(reject);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new Error('transaction aborted'));
  });
}

function reqAsync<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

// === 倉 ===

export async function getRegistryMeta(): Promise<RegistryMeta | null> {
  const db = await openDb();
  const meta = await tx(db, ['meta'], 'readonly', (t) =>
    reqAsync(t.objectStore('meta').get('registry'))
  );
  db.close();
  return (meta as RegistryMeta) ?? null;
}

export async function createRegistry(name: string): Promise<RegistryMeta> {
  const existing = await getRegistryMeta();
  if (existing) return existing; // 倉已存在即不重建（不覆蓋）
  const meta: RegistryMeta = {
    key: 'registry',
    name: name.trim() || 'unnamed registry',
    created_at: new Date().toISOString(),
  };
  const db = await openDb();
  await tx(db, ['meta'], 'readwrite', (t) => {
    t.objectStore('meta').put(meta);
  });
  db.close();
  return meta;
}

// === 讀 ===

export async function listFragments(
  status?: 'ACTIVE' | 'SEALED'
): Promise<ClientFragment[]> {
  const db = await openDb();
  const all = await tx(db, ['fragments'], 'readonly', (t) =>
    reqAsync(t.objectStore('fragments').getAll())
  );
  db.close();
  const list = (all as ClientFragment[]).sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
  return status ? list.filter((f) => f.status === status) : list;
}

export async function getFragment(id: string): Promise<{
  fragment: ClientFragment | null;
  outbound: ClientTrace[];
  inbound: ClientTrace[];
  witness: ClientWitness | null;
}> {
  const db = await openDb();
  const result = await tx(
    db,
    ['fragments', 'traces', 'witnesses'],
    'readonly',
    async (t) => {
      const fragment =
        ((await reqAsync(t.objectStore('fragments').get(id))) as ClientFragment) ??
        null;
      const outbound = (await reqAsync(
        t.objectStore('traces').index('from_id').getAll(id)
      )) as ClientTrace[];
      const inbound = (await reqAsync(
        t.objectStore('traces').index('to_id').getAll(id)
      )) as ClientTrace[];
      const witness =
        ((await reqAsync(t.objectStore('witnesses').get(id))) as ClientWitness) ??
        null;
      return { fragment, outbound, inbound, witness };
    }
  );
  db.close();
  return result;
}

// === 寫（律法在此執行）===

export async function createFragment(input: {
  module: string;
  type: string;
  content: string;
  traceIds: string[];
}): Promise<ClientFragment> {
  const module = (input.module.trim() || 'anon').toLowerCase();
  const type = input.type.trim() || 'note';
  const content = input.content.replace(/\r\n/g, '\n');
  if (!content.trim()) throw new Error('Content cannot be empty');

  const db = await openDb();
  const exists = async (id: string) => {
    const f = await tx(db, ['fragments'], 'readonly', (t) =>
      reqAsync(t.objectStore('fragments').get(id))
    );
    return !!f;
  };
  const id = await generateFragmentId(exists);
  const created_at = new Date().toISOString();
  const hash = await computeHash(id, created_at, module, type, content);

  const fragment: ClientFragment = {
    id, module, type, content, created_at,
    status: 'ACTIVE', sealed_at: null, seal_statement: null, seal_hash: null,
    hash,
  };

  await tx(db, ['fragments', 'traces'], 'readwrite', async (t) => {
    // 驗 trace 目標存在
    for (const to of input.traceIds) {
      const target = await reqAsync(t.objectStore('fragments').get(to));
      if (!target) throw new Error(`Trace target not found: ${to}`);
    }
    t.objectStore('fragments').add(fragment); // add：已存在即拋錯，永不覆蓋
    for (const to of input.traceIds) {
      t.objectStore('traces').add({ from_id: id, to_id: to, created_at });
    }
  });
  db.close();
  return fragment;
}

export async function sealFragment(
  id: string,
  seal_statement: string
): Promise<ClientFragment> {
  const statement = seal_statement.trim();
  if (!statement) throw new Error('Seal statement cannot be empty');
  if (statement.length > 140) throw new Error('Seal statement must not exceed 140 characters');

  const db = await openDb();
  const fragment = (await tx(db, ['fragments'], 'readonly', (t) =>
    reqAsync(t.objectStore('fragments').get(id))
  )) as ClientFragment | undefined;
  if (!fragment) { db.close(); throw new Error('Fragment not found'); }
  if (fragment.status === 'SEALED') { db.close(); throw new Error('Already sealed (write-once).'); }

  const sealed_at = new Date().toISOString();
  const seal_hash = await computeSealHash(id, sealed_at, fragment.hash, statement);
  const sealed: ClientFragment = {
    ...fragment, status: 'SEALED', sealed_at, seal_statement: statement, seal_hash,
  };
  await tx(db, ['fragments'], 'readwrite', (t) => {
    t.objectStore('fragments').put(sealed);
  });
  db.close();
  return sealed;
}

export async function addTraces(fromId: string, traceIds: string[]): Promise<void> {
  if (traceIds.length === 0) return;
  const db = await openDb();
  await tx(db, ['fragments', 'traces'], 'readwrite', async (t) => {
    const from = await reqAsync(t.objectStore('fragments').get(fromId));
    if (!from) throw new Error('Fragment not found');
    const created_at = new Date().toISOString();
    for (const to of traceIds) {
      if (to === fromId) throw new Error('Trace cannot be self-referential');
      const target = await reqAsync(t.objectStore('fragments').get(to));
      if (!target) throw new Error(`Trace target not found: ${to}`);
      t.objectStore('traces').add({ from_id: fromId, to_id: to, created_at });
    }
  });
  db.close();
}

/** 閱即見證：不存在才建（倉內 first-witness），存在即回傳既有 */
export async function ensureWitness(
  fragment_id: string,
  fragment_hash: string
): Promise<{ witness: ClientWitness; isNew: boolean }> {
  const db = await openDb();
  const existing = (await tx(db, ['witnesses'], 'readonly', (t) =>
    reqAsync(t.objectStore('witnesses').get(fragment_id))
  )) as ClientWitness | undefined;
  if (existing) { db.close(); return { witness: existing, isNew: false }; }

  const witnessed_at = new Date().toISOString();
  const witness: ClientWitness = {
    fragment_id, witnessed_at,
    witness_hash: await computeWitnessHash(fragment_id, witnessed_at, fragment_hash),
    fragment_hash, note: null,
  };
  try {
    await tx(db, ['witnesses'], 'readwrite', (t) => {
      t.objectStore('witnesses').add(witness); // add：race 時拋錯
    });
    db.close();
    return { witness, isNew: true };
  } catch {
    const again = (await tx(db, ['witnesses'], 'readonly', (t) =>
      reqAsync(t.objectStore('witnesses').get(fragment_id))
    )) as ClientWitness;
    db.close();
    return { witness: again, isNew: false };
  }
}

// === 匯出 / 匯入 ===

export type RegistryExport = {
  format: 'spiral-record-registry@1';
  exported_at: string;
  registry: { name: string; created_at: string };
  fragments: ClientFragment[];
  traces: ClientTrace[];
  witnesses: ClientWitness[];
};

export async function exportRegistry(): Promise<RegistryExport> {
  const meta = await getRegistryMeta();
  if (!meta) throw new Error('No registry');
  const db = await openDb();
  const dump = await tx(
    db,
    ['fragments', 'traces', 'witnesses'],
    'readonly',
    async (t) => ({
      fragments: (await reqAsync(t.objectStore('fragments').getAll())) as ClientFragment[],
      traces: (await reqAsync(t.objectStore('traces').getAll())) as ClientTrace[],
      witnesses: (await reqAsync(t.objectStore('witnesses').getAll())) as ClientWitness[],
    })
  );
  db.close();
  return {
    format: 'spiral-record-registry@1',
    exported_at: new Date().toISOString(),
    registry: { name: meta.name, created_at: meta.created_at },
    ...dump,
  };
}

/** 只允許匯入空倉（append-only：不做 merge、不覆蓋既有）。匯入前逐 fragment 驗 hash。 */
export async function importRegistry(data: RegistryExport): Promise<number> {
  if (data.format !== 'spiral-record-registry@1') throw new Error('Unknown export format');
  const current = await listFragments();
  if (current.length > 0) throw new Error('Import requires an empty registry (append-only law)');

  // 完整性驗證：hash 重算不合即整批拒絕
  for (const f of data.fragments) {
    const expect = await computeHash(f.id, f.created_at, f.module, f.type, f.content);
    if (expect !== f.hash) throw new Error(`Hash mismatch on ${f.id} — import rejected`);
  }

  const db = await openDb();
  await tx(db, ['meta', 'fragments', 'traces', 'witnesses'], 'readwrite', (t) => {
    t.objectStore('meta').put({
      key: 'registry',
      name: data.registry.name,
      created_at: data.registry.created_at,
    } satisfies RegistryMeta);
    for (const f of data.fragments) t.objectStore('fragments').add(f);
    for (const tr of data.traces) t.objectStore('traces').add(tr);
    for (const w of data.witnesses) t.objectStore('witnesses').add(w);
  });
  db.close();
  return data.fragments.length;
}
