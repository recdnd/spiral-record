'use client';

// 倉內 fragment 視圖：canonical payload、verify、seal（write-once）、trace、witness（閱即見證）。
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  getFragment,
  sealFragment,
  addTraces,
  ensureWitness,
} from '@/lib/client/registry';
import {
  ClientFragment,
  ClientTrace,
  ClientWitness,
  buildCanonicalPayload,
  buildCanonicalSealPayload,
  buildCanonicalWitnessPayload,
  computeHash,
} from '@/lib/client/integrity';

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <pre style={{ border: '1px solid #ccc', padding: '0.75rem', whiteSpace: 'pre-wrap', fontSize: '0.8rem', overflowX: 'auto' }}>
      {children}
    </pre>
  );
}

export default function MyFragmentPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id).toUpperCase();

  const [fragment, setFragment] = useState<ClientFragment | null>(null);
  const [outbound, setOutbound] = useState<ClientTrace[]>([]);
  const [inbound, setInbound] = useState<ClientTrace[]>([]);
  const [witness, setWitness] = useState<ClientWitness | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [sealStatement, setSealStatement] = useState('');
  const [traceInput, setTraceInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await getFragment(id);
    setFragment(r.fragment);
    setOutbound(r.outbound);
    setInbound(r.inbound);
    setWitness(r.witness);
    // 閱即見證
    if (r.fragment && !r.witness) {
      const w = await ensureWitness(r.fragment.id, r.fragment.hash);
      setWitness(w.witness);
    }
    setLoaded(true);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (!loaded) return null;
  if (!fragment) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <p>Fragment not found in this browser&apos;s registry.</p>
        <Link href="/my">← Back</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{fragment.id}</h1>
        <Link href="/my">← Registry</Link>
      </div>
      <p style={{ color: '#777', fontSize: '0.85rem', marginBottom: '1rem' }}>
        {fragment.module} · {fragment.type} · {fragment.created_at} ·{' '}
        {fragment.status === 'SEALED' ? '🔒 SEALED' : 'ACTIVE'}
      </p>

      <div style={{ border: '1px solid #000', padding: '1rem', whiteSpace: 'pre-wrap', marginBottom: '1.5rem' }}>
        {fragment.content}
      </div>

      <h2 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Canonical payload</h2>
      <Mono>{buildCanonicalPayload(fragment)}</Mono>
      <div style={{ fontSize: '0.8rem', color: '#777', marginBottom: '0.5rem' }}>
        hash: <code>{fragment.hash}</code>
      </div>
      <button
        onClick={async () => {
          const recomputed = await computeHash(
            fragment.id, fragment.created_at, fragment.module, fragment.type, fragment.content
          );
          setVerifyResult(
            recomputed === fragment.hash
              ? '✓ hash verified — content is exactly as recorded'
              : '✗ HASH MISMATCH — record has been tampered with'
          );
        }}
        style={{ border: '1px solid #000', padding: '0.3rem 0.9rem', background: '#fff', cursor: 'pointer', marginBottom: '0.5rem' }}
      >
        Verify
      </button>
      {verifyResult && (
        <div style={{ marginBottom: '1rem', color: verifyResult.startsWith('✓') ? '#060' : '#a00' }}>
          {verifyResult}
        </div>
      )}

      {/* Seal */}
      <h2 style={{ fontWeight: 'bold', margin: '1.5rem 0 0.5rem' }}>Seal</h2>
      {fragment.status === 'SEALED' ? (
        <>
          <Mono>{buildCanonicalSealPayload(fragment)}</Mono>
          <div style={{ fontSize: '0.8rem', color: '#777', marginBottom: '1rem' }}>
            seal_hash: <code>{fragment.seal_hash}</code>
          </div>
        </>
      ) : (
        <div style={{ border: '1px solid #ccc', padding: '0.75rem', marginBottom: '1rem' }}>
          <input
            value={sealStatement}
            onChange={(e) => setSealStatement(e.target.value)}
            placeholder="Seal statement (≤140 chars) — write-once, irreversible"
            maxLength={140}
            style={{ border: '1px solid #999', padding: '0.4rem', width: '100%', marginBottom: '0.5rem' }}
          />
          <button
            onClick={async () => {
              setError(null);
              try {
                await sealFragment(fragment.id, sealStatement);
                await load();
              } catch (err: any) {
                setError(err.message);
              }
            }}
            style={{ border: '1px solid #a00', padding: '0.4rem 1rem', background: '#fff', color: '#a00', cursor: 'pointer' }}
          >
            🔒 Seal (irreversible)
          </button>
        </div>
      )}

      {/* Traces */}
      <h2 style={{ fontWeight: 'bold', margin: '1.5rem 0 0.5rem' }}>Traces</h2>
      {outbound.length === 0 && inbound.length === 0 && (
        <p style={{ color: '#777', fontSize: '0.9rem' }}>No traces.</p>
      )}
      {outbound.map((t, i) => (
        <div key={`o${i}`} style={{ fontSize: '0.9rem' }}>
          → <Link href={`/my/f/${t.to_id}`}>{t.to_id}</Link>
        </div>
      ))}
      {inbound.map((t, i) => (
        <div key={`i${i}`} style={{ fontSize: '0.9rem' }}>
          ← <Link href={`/my/f/${t.from_id}`}>{t.from_id}</Link>
        </div>
      ))}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
        <input
          value={traceInput}
          onChange={(e) => setTraceInput(e.target.value)}
          placeholder="Add traces: FRAG-…, FRAG-…"
          style={{ border: '1px solid #999', padding: '0.4rem', flex: 1 }}
        />
        <button
          onClick={async () => {
            setError(null);
            try {
              await addTraces(
                fragment.id,
                traceInput.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
              );
              setTraceInput('');
              await load();
            } catch (err: any) {
              setError(err.message);
            }
          }}
          style={{ border: '1px solid #000', padding: '0.4rem 1rem', background: '#fff', cursor: 'pointer' }}
        >
          Add
        </button>
      </div>

      {/* Witness */}
      <h2 style={{ fontWeight: 'bold', margin: '1.5rem 0 0.5rem' }}>Witness</h2>
      {witness ? (
        <Mono>{buildCanonicalWitnessPayload(witness)}</Mono>
      ) : (
        <p style={{ color: '#777' }}>—</p>
      )}

      {error && <div style={{ color: '#a00', marginTop: '1rem' }}>{error}</div>}
    </div>
  );
}
