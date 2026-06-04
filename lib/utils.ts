import { createHash } from 'crypto';

const FRAGMENT_TYPES = ['claim', 'promise', 'definition', 'confession', 'note'] as const;
export type FragmentType = typeof FRAGMENT_TYPES[number];

export function isValidFragmentType(type: string): type is FragmentType {
  return FRAGMENT_TYPES.includes(type as FragmentType);
}

export function normalizeModule(module: string): string {
  const normalized = module.trim();
  if (normalized.length === 0 || normalized.length > 32) {
    return 'anon';
  }
  // Allow [a-zA-Z0-9_-]
  if (!/^[a-zA-Z0-9_-]+$/.test(normalized)) {
    return 'anon';
  }
  return normalized;
}

export function normalizeType(type: string): FragmentType {
  return isValidFragmentType(type) ? type : 'note';
}

/**
 * Strip Spiral meta-language directives from content and collect them.
 * 
 * Meta Language Rule:
 * - Any line starting with exact prefix "𖡎:" (after trimStart) is a Spiral meta directive.
 * - Meta directives MUST NOT be stored in fragment.content
 * - Meta directives MUST NOT be hashed
 * - Meta directives MUST NOT appear in canonical payload
 * - Meta directives MUST be recorded in meta_audit log
 * 
 * Rules:
 * - Split content by \n
 * - For each line:
 *   - let t = line.trimStart()
 *   - if t startsWith "𖡎:" => classify meta
 *     - raw_line = original line (not trimmed)
 *     - directive = t.slice("𖡎:".length).trim() (edges only)
 *   - else keep in content unchanged
 * - Rejoin kept lines with "\n" exactly (preserve blank lines among non-meta lines)
 * - Do not trim final content.
 */
export function stripAndCollectMeta(rawContent: string): {
  content: string;
  meta_lines: Array<{
    raw_line: string;
    directive: string;
  }>;
} {
  const lines = rawContent.split('\n');
  const contentLines: string[] = [];
  const metaLines: Array<{ raw_line: string; directive: string }> = [];

  for (const line of lines) {
    const trimmedStart = line.trimStart();
    if (trimmedStart.startsWith('𖡎:')) {
      // This is a meta directive
      const directive = trimmedStart.slice('𖡎:'.length).trim();
      metaLines.push({
        raw_line: line, // exact original line
        directive: directive,
      });
    } else {
      // Keep in content unchanged
      contentLines.push(line);
    }
  }

  return {
    content: contentLines.join('\n'),
    meta_lines: metaLines,
  };
}

/**
 * @deprecated Use stripAndCollectMeta instead
 * Kept for backward compatibility
 */
export function stripMetaDirectives(rawContent: string): string {
  return stripAndCollectMeta(rawContent).content;
}

export function normalizeContent(content: string): string {
  // First strip meta directives (control language)
  const stripped = stripAndCollectMeta(content).content;
  // Then trim only trailing whitespace, preserve leading and internal
  return stripped.replace(/\s+$/, '');
}

export function validateContent(content: string): { valid: boolean; error?: string } {
  const normalized = normalizeContent(content);
  if (normalized.length === 0) {
    return { valid: false, error: 'Content cannot be empty' };
  }
  if (normalized.length > 4000) {
    return { valid: false, error: 'Content cannot exceed 4000 characters' };
  }
  return { valid: true };
}

export function validateFragmentId(id: string): boolean {
  return /^FRAG-\d{8}-[0-9A-F]{4}$/.test(id);
}

export function normalizeFragmentIds(ids: string): string[] {
  return ids
    .split(/[,\s]+/)
    .map(id => id.trim().toUpperCase())
    .filter(id => id.length > 0 && validateFragmentId(id));
}

export function generateFragmentId(db: any): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const random = Math.floor(Math.random() * 0x10000)
      .toString(16)
      .toUpperCase()
      .padStart(4, '0');
    const id = `FRAG-${today}-${random}`;

    const existing = db.prepare('SELECT id FROM fragments WHERE id = ?').get(id);
    if (!existing) {
      return id;
    }
    attempts++;
  }

  throw new Error('Failed to generate unique fragment ID');
}

export function generateMetaId(db: any): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const random = Math.floor(Math.random() * 0x10000)
      .toString(16)
      .toUpperCase()
      .padStart(4, '0');
    const id = `META-${today}-${random}`;

    const existing = db.prepare('SELECT meta_id FROM meta_audit WHERE meta_id = ?').get(id);
    if (!existing) {
      return id;
    }
    attempts++;
  }

  throw new Error('Failed to generate unique meta ID');
}

export function computeHash(id: string, created_at: string, module: string, type: string, content: string): string {
  const canonical = `${id}|${created_at}|${module}|${type}|${content}`;
  return createHash('sha256').update(canonical).digest('hex');
}

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Seal statement templates
export const SEAL_TEMPLATES = [
  'I seal this as final.',
  'I seal this to prevent revision.',
  'I seal this as a record.',
] as const;

export type SealTemplate = typeof SEAL_TEMPLATES[number];

export function isValidSealTemplate(template: string): template is SealTemplate {
  return SEAL_TEMPLATES.includes(template as SealTemplate);
}

export function buildSealStatement(template: string, customNote: string | null): { statement: string; error?: string } {
  if (!isValidSealTemplate(template)) {
    return { statement: '', error: 'Invalid seal template' };
  }

  const trimmedNote = customNote ? customNote.trim() : '';
  const hasNote = trimmedNote.length > 0;

  let statement: string;
  if (hasNote) {
    statement = `${template} — ${trimmedNote}`;
  } else {
    statement = template;
  }

  if (statement.length > 140) {
    return { statement: '', error: 'Seal statement must not exceed 140 characters' };
  }

  return { statement };
}

export function computeSealHash(fragment_id: string, sealed_at: string, fragment_hash: string, seal_statement: string): string {
  const canonical = `${fragment_id}|${sealed_at}|${fragment_hash}|${seal_statement}`;
  return createHash('sha256').update(canonical).digest('hex');
}

export function parseSealStatement(seal_statement: string): { template: string; note: string | null } {
  const parts = seal_statement.split(' — ');
  if (parts.length === 1) {
    return { template: parts[0], note: null };
  }
  return { template: parts[0], note: parts.slice(1).join(' — ') };
}

export function computeWitnessHash(fragment_id: string, witnessed_at: string, fragment_hash: string): string {
  const canonical = `${fragment_id}|${witnessed_at}|${fragment_hash}`;
  return createHash('sha256').update(canonical).digest('hex');
}

export function computeMetaHash(
  meta_id: string,
  created_at: string,
  source: string,
  module: string,
  fragment_id: string | null,
  directive: string,
  raw_line: string
): string {
  const canonical = `${meta_id}|${created_at}|${source}|${module}|${fragment_id || ''}|${directive}|${raw_line}`;
  return createHash('sha256').update(canonical).digest('hex');
}

