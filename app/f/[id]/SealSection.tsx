'use client';

import { useState } from 'react';
import { buildCanonicalSealPayload } from '@/lib/canonical';

type SealSectionProps = {
  fragment: {
    id: string;
    sealed_at: string;
    seal_statement: string;
    seal_hash: string;
    hash: string;
  };
};

export function SealSection({ fragment }: SealSectionProps) {
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  // Generate canonical seal payload using the shared function
  const generatePayload = (): string => {
    return buildCanonicalSealPayload({
      id: fragment.id,
      module: '',
      type: '',
      content: '',
      created_at: '',
      status: 'SEALED',
      sealed_at: fragment.sealed_at,
      seal_statement: fragment.seal_statement,
      seal_hash: fragment.seal_hash,
      hash: fragment.hash,
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
      await navigator.clipboard.writeText(fragment.seal_hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } catch (err) {
      console.error('Failed to copy hash:', err);
    }
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Seal</h2>

      <div style={{ backgroundColor: '#f8f9fa', padding: '1.5rem', borderRadius: '4px' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <strong>Sealed At:</strong> {new Date(fragment.sealed_at).toLocaleString('zh-TW')}
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <strong>Seal Statement:</strong>
          <div
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: '3px',
              fontStyle: 'italic',
              whiteSpace: 'pre-wrap',
            }}
          >
            "{fragment.seal_statement}"
          </div>
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <strong>Seal Hash:</strong>{' '}
          <code
            style={{
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              wordBreak: 'break-all',
              backgroundColor: '#fff',
              padding: '0.25rem 0.5rem',
              borderRadius: '3px',
            }}
          >
            {fragment.seal_hash}
          </code>
        </div>

        <div style={{ marginTop: '1rem', marginBottom: '0.75rem' }}>
          <strong>Canonical Seal Payload:</strong>
          <div
            style={{
              border: '2px solid #ff4221',
              borderRadius: '4px',
              padding: '1rem',
              backgroundColor: '#fff',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              marginTop: '0.5rem',
              userSelect: 'text',
            }}
          >
            {payloadText}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button onClick={copyPayload} className="btn-base">
            {copiedPayload ? '✓ Copied' : 'Copy Seal Payload'}
          </button>
          <button onClick={copyHash} className="btn-base">
            {copiedHash ? '✓ Copied' : 'Copy Seal Hash'}
          </button>
        </div>
      </div>
    </div>
  );
}
