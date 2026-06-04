/**
 * Parse canonical payload back into component fields.
 * Used for verification and round-trip testing.
 * 
 * Parser is STRICT:
 * - Requires exact header and footer
 * - Requires fields in exact order
 * - Preserves content exactly (no trimming, no normalization)
 */

export type ParsedCanonicalPayload = {
  id: string;
  created_at: string;
  module: string;
  type: string;
  content: string;
};

export type ParsedCanonicalSealPayload = {
  fragment_id: string;
  sealed_at: string;
  fragment_hash: string;
  seal_statement: string;
};

export type ParsedCanonicalWitnessPayload = {
  fragment_id: string;
  witnessed_at: string;
  fragment_hash: string;
};

export class ParseError extends Error {
  constructor(message: string) {
    super(`PARSE_ERROR: ${message}`);
    this.name = 'ParseError';
  }
}

export function parseCanonicalPayload(payload: string): ParsedCanonicalPayload {
  const lines = payload.split('\n');
  
  // Find header and footer
  const headerIndex = lines.findIndex(line => line.trim() === '--- CANONICAL PAYLOAD ---');
  const footerIndex = lines.findIndex(line => line.trim() === '--- END PAYLOAD ---');
  
  if (headerIndex === -1) {
    throw new ParseError('Missing header: --- CANONICAL PAYLOAD ---');
  }
  if (footerIndex === -1) {
    throw new ParseError('Missing footer: --- END PAYLOAD ---');
  }
  if (footerIndex <= headerIndex) {
    throw new ParseError('Footer must come after header');
  }
  
  // Extract fields in exact order
  const expectedOrder = ['id', 'created_at', 'module', 'type', 'content'];
  const foundFields: string[] = [];
  const data: Record<string, string> = {};
  let contentStartIndex = -1;
  
  for (let i = headerIndex + 1; i < footerIndex; i++) {
    const line = lines[i];
    const colonIndex = line.indexOf(':');
    
    if (colonIndex === -1) continue;
    
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    
    if (key === 'content') {
      contentStartIndex = i;
      foundFields.push('content');
      break;
    }
    
    foundFields.push(key);
    data[key] = value;
  }
  
  // Verify field order
  const orderCheck = foundFields.slice(0, -1); // Exclude 'content' from order check
  if (orderCheck.join(',') !== expectedOrder.slice(0, -1).join(',')) {
    throw new ParseError(`Fields out of order. Expected: ${expectedOrder.slice(0, -1).join(', ')}, found: ${orderCheck.join(', ')}`);
  }
  
  if (contentStartIndex === -1) {
    throw new ParseError('Missing content field');
  }
  
  // Extract content (everything after "content:" until footer, preserving newlines exactly)
  const contentLines = lines.slice(contentStartIndex + 1, footerIndex);
  const content = contentLines.join('\n');
  
  // Validate required fields
  if (!data.id || !data.created_at || !data.module || !data.type) {
    throw new ParseError('Missing required fields: id, created_at, module, or type');
  }
  
  // Reject meta directives in content (control language must not appear in canonical payload)
  const contentLinesForCheck = content.split('\n');
  for (const line of contentLinesForCheck) {
    const trimmed = line.trim();
    if (trimmed.startsWith('𖡎:')) {
      throw new ParseError('Meta directives are not allowed in canonical payload');
    }
  }
  
  return {
    id: data.id.toUpperCase().trim(),
    created_at: data.created_at.trim(),
    module: data.module.trim(),
    type: data.type.trim(),
    content: content, // Preserve exactly as is, no trimming
  };
}

export function parseCanonicalSealPayload(payload: string): ParsedCanonicalSealPayload {
  const lines = payload.split('\n');
  
  const headerIndex = lines.findIndex(line => line.trim() === '--- SEAL STATEMENT ---');
  const footerIndex = lines.findIndex(line => line.trim() === '--- END SEAL ---');
  
  if (headerIndex === -1) {
    throw new ParseError('Missing header: --- SEAL STATEMENT ---');
  }
  if (footerIndex === -1) {
    throw new ParseError('Missing footer: --- END SEAL ---');
  }
  if (footerIndex <= headerIndex) {
    throw new ParseError('Footer must come after header');
  }
  
  const expectedOrder = ['fragment_id', 'sealed_at', 'fragment_hash', 'seal_statement'];
  const data: Record<string, string> = {};
  
  for (let i = headerIndex + 1; i < footerIndex; i++) {
    const line = lines[i];
    const colonIndex = line.indexOf(':');
    
    if (colonIndex === -1) continue;
    
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    data[key] = value;
  }
  
  // Verify all required fields
  for (const key of expectedOrder) {
    if (!data[key]) {
      throw new ParseError(`Missing required field: ${key}`);
    }
  }
  
  return {
    fragment_id: data.fragment_id.trim(),
    sealed_at: data.sealed_at.trim(),
    fragment_hash: data.fragment_hash.trim(),
    seal_statement: data.seal_statement.trim(),
  };
}

export function parseCanonicalWitnessPayload(payload: string): ParsedCanonicalWitnessPayload {
  const lines = payload.split('\n');
  
  const headerIndex = lines.findIndex(line => line.trim() === '--- WITNESS RECORD ---');
  const footerIndex = lines.findIndex(line => line.trim() === '--- END WITNESS ---');
  
  if (headerIndex === -1) {
    throw new ParseError('Missing header: --- WITNESS RECORD ---');
  }
  if (footerIndex === -1) {
    throw new ParseError('Missing footer: --- END WITNESS ---');
  }
  if (footerIndex <= headerIndex) {
    throw new ParseError('Footer must come after header');
  }
  
  const expectedOrder = ['fragment_id', 'witnessed_at', 'fragment_hash'];
  const data: Record<string, string> = {};
  
  for (let i = headerIndex + 1; i < footerIndex; i++) {
    const line = lines[i];
    const colonIndex = line.indexOf(':');
    
    if (colonIndex === -1) continue;
    
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    data[key] = value;
  }
  
  // Verify all required fields
  for (const key of expectedOrder) {
    if (!data[key]) {
      throw new ParseError(`Missing required field: ${key}`);
    }
  }
  
  return {
    fragment_id: data.fragment_id.trim(),
    witnessed_at: data.witnessed_at.trim(),
    fragment_hash: data.fragment_hash.trim(),
  };
}
