// 瀏覽器端完整性邏輯 — 與 lib/utils.ts / lib/canonical.ts 的 canonical 形完全一致。
// 唯一差異：Web Crypto 是 async。格式改動＝breaking change（與伺服器側同一戒律）。

export type ClientFragment = {
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

export type ClientTrace = {
  from_id: string;
  to_id: string;
  created_at: string;
};

export type ClientWitness = {
  fragment_id: string;
  witnessed_at: string;
  witness_hash: string;
  fragment_hash: string;
  note: string | null;
};

export async function sha256hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// === hash（canonical 形與 lib/utils.ts 逐字對齊）===

export function computeHashCanonical(
  id: string, created_at: string, module: string, type: string, content: string
): string {
  return `${id}|${created_at}|${module}|${type}|${content}`;
}

export async function computeHash(
  id: string, created_at: string, module: string, type: string, content: string
): Promise<string> {
  return sha256hex(computeHashCanonical(id, created_at, module, type, content));
}

export async function computeSealHash(
  fragment_id: string, sealed_at: string, fragment_hash: string, seal_statement: string
): Promise<string> {
  return sha256hex(`${fragment_id}|${sealed_at}|${fragment_hash}|${seal_statement}`);
}

export async function computeWitnessHash(
  fragment_id: string, witnessed_at: string, fragment_hash: string
): Promise<string> {
  return sha256hex(`${fragment_id}|${witnessed_at}|${fragment_hash}`);
}

// === canonical payloads（與 lib/canonical.ts 逐字對齊）===

export function buildCanonicalPayload(f: ClientFragment): string {
  return `--- CANONICAL PAYLOAD ---
id: ${f.id}
created_at: ${f.created_at}
module: ${f.module}
type: ${f.type}
content:
${f.content}
--- END PAYLOAD ---`;
}

export function buildCanonicalSealPayload(f: ClientFragment): string {
  if (!f.sealed_at || !f.seal_statement || !f.seal_hash) {
    throw new Error('Fragment is not sealed');
  }
  return `--- SEAL STATEMENT ---
fragment_id: ${f.id}
sealed_at: ${f.sealed_at}
fragment_hash: ${f.hash}
seal_statement: ${f.seal_statement}
--- END SEAL ---`;
}

export function buildCanonicalWitnessPayload(w: ClientWitness): string {
  return `--- WITNESS RECORD ---
fragment_id: ${w.fragment_id}
witnessed_at: ${w.witnessed_at}
fragment_hash: ${w.fragment_hash}
--- END WITNESS ---`;
}

// === id 生成（格式與 lib/utils.ts generateFragmentId 一致：FRAG-YYYYMMDD-XXXX）===

export async function generateFragmentId(
  exists: (id: string) => Promise<boolean>
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  for (let attempts = 0; attempts < 100; attempts++) {
    const random = Math.floor(Math.random() * 0x10000)
      .toString(16)
      .toUpperCase()
      .padStart(4, '0');
    const id = `FRAG-${today}-${random}`;
    if (!(await exists(id))) return id;
  }
  throw new Error('Failed to generate unique fragment ID');
}
