'use client';

// 門面閘：進入後建倉。無倉 → 建倉；有倉 → 入倉。
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRegistryMeta, createRegistry, RegistryMeta } from '@/lib/client/registry';

export function RegistryGate() {
  const [meta, setMeta] = useState<RegistryMeta | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getRegistryMeta()
      .then(setMeta)
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  if (meta) {
    return (
      <div style={{ border: '1px solid #000', padding: '1.5rem', marginTop: '1rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          Your registry: <strong>{meta.name}</strong>
          <span style={{ color: '#777', fontSize: '0.85rem' }}>
            {' '}· created {meta.created_at.slice(0, 10)} · stored in this browser
          </span>
        </div>
        <Link
          href="/my"
          style={{
            display: 'inline-block',
            border: '1px solid #000',
            padding: '0.5rem 1.25rem',
            textDecoration: 'none',
            color: '#000',
          }}
        >
          Enter registry →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid #000', padding: '1.5rem', marginTop: '1rem' }}>
      <div style={{ marginBottom: '0.75rem' }}>
        No registry in this browser yet. Create one — it lives on your device, not on a
        server.
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="registry name (optional)"
          style={{ border: '1px solid #999', padding: '0.5rem', flex: 1 }}
        />
        <button
          disabled={creating}
          onClick={async () => {
            setCreating(true);
            try {
              setMeta(await createRegistry(name));
            } finally {
              setCreating(false);
            }
          }}
          style={{
            border: '1px solid #000',
            padding: '0.5rem 1.25rem',
            background: '#000',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Create registry
        </button>
      </div>
    </div>
  );
}
