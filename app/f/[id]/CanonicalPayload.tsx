'use client';

import { useState } from 'react';
import { buildCanonicalPayload } from '@/lib/canonical';

type CanonicalPayloadProps = {
  id: string;
  created_at: string;
  module: string;
  type: string;
  content: string;
  hash: string;
};

export function CanonicalPayload({ id, created_at, module, type, content, hash }: CanonicalPayloadProps) {
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  // Generate canonical payload using the shared function
  const generatePayload = (): string => {
    return buildCanonicalPayload({
      id,
      created_at,
      module,
      type,
      content,
      status: 'ACTIVE',
      sealed_at: null,
      seal_statement: null,
      seal_hash: null,
      hash,
    });
  };

  const payloadText = generatePayload();

  const copyPayload = async () => {
    try {
      await navigator.clipboard.writeText(payloadText);
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    } catch (err) {
      console.error('Failed to copy payload:', err);
    }
  };

  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } catch (err) {
      console.error('Failed to copy hash:', err);
    }
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.75rem' }}>
        Canonical Record
      </h2>
      
      <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>
        This is the canonical form of the fragment. It represents what was recorded.
      </p>

      <div
        style={{
          border: '2px solid #ff4221',
          borderRadius: '4px',
          padding: '1.5rem',
          backgroundColor: '#fff',
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          position: 'relative',
          userSelect: 'text',
        }}
      >
        {payloadText}
      </div>

      <div style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={copyPayload} className="btn-base">
            {copiedPayload ? '✓ Copied' : 'Copy Canonical Payload'}
          </button>
          <button onClick={copyHash} className="btn-base">
            {copiedHash ? '✓ Copied' : 'Copy Hash'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}>
        <strong>sha256:</strong>{' '}
        <code
          style={{
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            wordBreak: 'break-all',
            backgroundColor: '#f8f9fa',
            padding: '0.25rem 0.5rem',
            borderRadius: '3px',
          }}
        >
          {hash}
        </code>
      </div>

      <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>
        This payload can be independently verified. Any change invalidates the hash.
      </p>

      <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#999' }}>
        Language here is treated as an event, not a draft.
      </p>
    </div>
  );
}
