'use client';

import { useState } from 'react';

type CopyButtonsProps = {
  payload: string;
  hash: string;
};

export function CopyButtons({ payload, hash }: CopyButtonsProps) {
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  const copyPayload = async () => {
    try {
      await navigator.clipboard.writeText(payload);
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
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <button className="btn-base" onClick={copyPayload}>
        {copiedPayload ? '✓ Copied' : 'Copy Meta Payload'}
      </button>
      <button className="btn-base" onClick={copyHash}>
        {copiedHash ? '✓ Copied' : 'Copy Meta Hash'}
      </button>
    </div>
  );
}

