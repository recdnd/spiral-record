'use client';

import { useState } from 'react';
import { buildCanonicalWitnessPayload } from '@/lib/canonical';

type WitnessSectionProps = {
  witness: {
    fragment_id: string;
    witnessed_at: string;
    witness_hash: string;
    fragment_hash: string;
  } | null;
};

export function WitnessSection({ witness }: WitnessSectionProps) {
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  if (!witness) {
    return null;
  }

  // Generate canonical witness payload using the shared function
  const generatePayload = (): string => {
    return buildCanonicalWitnessPayload({
      id: 0,
      fragment_id: witness.fragment_id,
      witnessed_at: witness.witnessed_at,
      witness_hash: witness.witness_hash,
      fragment_hash: witness.fragment_hash,
      note: null,
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
      await navigator.clipboard.writeText(witness.witness_hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } catch (err) {
      console.error('Failed to copy hash:', err);
    }
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Witness</h2>

      <div style={{ backgroundColor: '#f8f9fa', padding: '1.5rem', borderRadius: '4px' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <strong>Witnessed At:</strong> {new Date(witness.witnessed_at).toLocaleString('zh-TW')}
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <strong>Witness Hash:</strong>{' '}
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
            {witness.witness_hash}
          </code>
        </div>

        <div style={{ marginTop: '1rem', marginBottom: '0.75rem' }}>
          <strong>Canonical Witness Payload:</strong>
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
            {copiedPayload ? '✓ Copied' : 'Copy Witness Payload'}
          </button>
          <button onClick={copyHash} className="btn-base">
            {copiedHash ? '✓ Copied' : 'Copy Witness Hash'}
          </button>
        </div>
      </div>
    </div>
  );
}
