import { FragmentRow, WitnessRow } from './db-testable';

/**
 * Build canonical payload for a fragment.
 * Format must remain stable - any change is a breaking change.
 */
export function buildCanonicalPayload(fragment: FragmentRow): string {
  return `--- CANONICAL PAYLOAD ---
id: ${fragment.id}
created_at: ${fragment.created_at}
module: ${fragment.module}
type: ${fragment.type}
content:
${fragment.content}
--- END PAYLOAD ---`;
}

/**
 * Build canonical seal payload.
 * Format must remain stable - any change is a breaking change.
 */
export function buildCanonicalSealPayload(fragment: FragmentRow): string {
  if (!fragment.sealed_at || !fragment.seal_statement || !fragment.seal_hash) {
    throw new Error('Fragment is not sealed');
  }
  
  return `--- SEAL STATEMENT ---
fragment_id: ${fragment.id}
sealed_at: ${fragment.sealed_at}
fragment_hash: ${fragment.hash}
seal_statement: ${fragment.seal_statement}
--- END SEAL ---`;
}

/**
 * Build canonical witness payload.
 * Format must remain stable - any change is a breaking change.
 */
export function buildCanonicalWitnessPayload(witness: WitnessRow): string {
  return `--- WITNESS RECORD ---
fragment_id: ${witness.fragment_id}
witnessed_at: ${witness.witnessed_at}
fragment_hash: ${witness.fragment_hash}
--- END WITNESS ---`;
}

export type MetaAuditRow = {
  meta_id: string;
  created_at: string;
  source: 'submission' | 'system';
  module: string;
  fragment_id: string | null;
  directive: string;
  raw_line: string;
  meta_hash: string;
};

/**
 * Build canonical meta payload.
 * Format must remain stable - any change is a breaking change.
 */
export function buildCanonicalMetaPayload(meta: MetaAuditRow): string {
  const fragmentIdLine = meta.fragment_id ? `fragment_id: ${meta.fragment_id}` : 'fragment_id: ';
  
  return `--- META AUDIT ---
meta_id: ${meta.meta_id}
created_at: ${meta.created_at}
source: ${meta.source}
module: ${meta.module}
${fragmentIdLine}
directive: ${meta.directive}
raw_line: ${meta.raw_line}
--- END META ---`;
}

