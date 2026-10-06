'use client';

// 我的倉：提交 + feed + 匯出/匯入。全部發生在本瀏覽器。
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  RegistryMeta,
  getRegistryMeta,
  listFragments,
  createFragment,
  exportRegistry,
  importRegistry,
  RegistryExport,
} from '@/lib/client/registry';
import { ClientFragment } from '@/lib/client/integrity';

const TYPES = ['claim', 'promise', 'definition', 'confession', 'note'];

export default function MyRegistryPage() {
  const [meta, setMeta] = useState<RegistryMeta | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [fragments, setFragments] = useState<ClientFragment[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'SEALED'>('ALL');

  const [module, setModule] = useState('');
  const [type, setType] = useState('note');
  const [content, setContent] = useState('');
  const [traces, setTraces] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setFragments(await listFragments());
  }, []);

  useEffect(() => {
    (async () => {
      setMeta(await getRegistryMeta());
      await refresh();
      setLoaded(true);
    })();
  }, [refresh]);

  if (!loaded) return null;

  if (!meta) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <p>No registry in this browser.</p>
        <Link href="/">← Create one on the home page</Link>
      </div>
    );
  }

  const shown = fragments.filter((f) => filter === 'ALL' || f.status === filter);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{meta.name}</h1>
        <Link href="/">Home</Link>
      </div>
      <p style={{ color: '#777', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Local registry · this browser only · append-only / write-once seals / first-witness
      </p>

      {/* 提交 */}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setBusy(true);
          try {
            await createFragment({
              module,
              type,
              content,
              traceIds: traces
                .split(',')
                .map((s) => s.trim().toUpperCase())
                .filter(Boolean),
            });
            setContent('');
            setTraces('');
            await refresh();
          } catch (err: any) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
        style={{ border: '1px solid #000', padding: '1rem', marginBottom: '2rem' }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            value={module}
            onChange={(e) => setModule(e.target.value)}
            placeholder="module (anon)"
            style={{ border: '1px solid #999', padding: '0.4rem', flex: 1 }}
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ border: '1px solid #999', padding: '0.4rem' }}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Content — immutable after submission"
          rows={4}
          style={{ border: '1px solid #999', padding: '0.4rem', width: '100%', marginBottom: '0.5rem' }}
        />
        <input
          value={traces}
          onChange={(e) => setTraces(e.target.value)}
          placeholder="Trace (optional, comma-separated fragment IDs)"
          style={{ border: '1px solid #999', padding: '0.4rem', width: '100%', marginBottom: '0.5rem' }}
        />
        <div style={{ fontSize: '0.85rem', color: '#a00', marginBottom: '0.5rem' }}>
          ⚠️ Irreversible: no edit, no delete.
        </div>
        {error && <div style={{ color: '#a00', marginBottom: '0.5rem' }}>{error}</div>}
        <button
          disabled={busy}
          type="submit"
          style={{ border: '1px solid #000', padding: '0.5rem 1.25rem', background: '#000', color: '#fff', cursor: 'pointer' }}
        >
          Submit Fragment
        </button>
      </form>

      {/* feed */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        {(['ALL', 'ACTIVE', 'SEALED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              border: '1px solid #000',
              padding: '0.25rem 0.75rem',
              background: filter === s ? '#000' : '#fff',
              color: filter === s ? '#fff' : '#000',
              cursor: 'pointer',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p style={{ color: '#777' }}>No fragments yet.</p>
      ) : (
        shown.map((f) => (
          <Link
            key={f.id}
            href={`/my/f/${f.id}`}
            style={{ display: 'block', border: '1px solid #ccc', padding: '0.75rem', marginBottom: '0.5rem', textDecoration: 'none', color: '#000' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#777' }}>
              <span>{f.id} · {f.module} · {f.type}</span>
              <span>{f.status === 'SEALED' ? '🔒 SEALED' : 'ACTIVE'}</span>
            </div>
            <div style={{ whiteSpace: 'pre-wrap', overflow: 'hidden', textOverflow: 'ellipsis', maxHeight: '3.6em' }}>
              {f.content}
            </div>
          </Link>
        ))
      )}

      {/* 匯出 / 匯入 */}
      <div style={{ borderTop: '1px solid #ccc', marginTop: '2rem', paddingTop: '1rem', display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={async () => {
            const dump = await exportRegistry();
            const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `spiral-record-${meta.name.replace(/\s+/g, '_')}-${dump.exported_at.slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
          }}
          style={{ border: '1px solid #000', padding: '0.4rem 1rem', background: '#fff', cursor: 'pointer' }}
        >
          Export registry
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          style={{ border: '1px solid #999', padding: '0.4rem 1rem', background: '#fff', cursor: 'pointer' }}
        >
          Import (empty registry only)
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setError(null);
            try {
              const data = JSON.parse(await file.text()) as RegistryExport;
              const n = await importRegistry(data);
              setMeta(await getRegistryMeta());
              await refresh();
              alert(`Imported ${n} fragments (hash-verified).`);
            } catch (err: any) {
              setError(err.message);
            } finally {
              e.target.value = '';
            }
          }}
        />
      </div>
    </div>
  );
}
