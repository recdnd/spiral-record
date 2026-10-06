import { getDb } from '@/lib/db';
import { addTraces } from '@/app/actions';
import { escapeHtml } from '@/lib/utils';
import { ensureWitness } from '@/lib/witness';
import { IS_READ_ONLY } from '@/lib/readonly';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FragmentForm } from './FragmentForm';
import { CanonicalPayload } from './CanonicalPayload';
import { SealForm } from './SealForm';
import { SealSection } from './SealSection';
import { WitnessSection } from './WitnessSection';

type FragmentPageProps = {
  params: { id: string };
  searchParams: { recorded?: string; witnessed?: string };
};

export default function FragmentPage({ params, searchParams }: FragmentPageProps) {
  const db = getDb();
  const fragmentIdUpper = params.id.toUpperCase();
  
  
  let fragment: any;
  try {
    fragment = db.prepare('SELECT * FROM fragments WHERE id = ?').get(fragmentIdUpper) as any;
    
  } catch (error: any) {
    throw error;
  }

  if (!fragment) {
    notFound();
  }

  // Create witness record if it doesn't exist (race-safe)
  // 唯讀部署：不產生新見證，只顯示快照裡既有的
  let witness: any;
  let isNew: boolean;
  if (IS_READ_ONLY) {
    witness =
      db
        .prepare('SELECT * FROM witnesses WHERE fragment_id = ?')
        .get(fragmentIdUpper) ?? null;
    isNew = false;
  } else {
    const result = ensureWitness(fragmentIdUpper, fragment.hash);
    witness = result.witness;
    isNew = result.isNew;
  }

  const outboundTraces = db
    .prepare('SELECT t.*, f.module, f.type, f.status FROM traces t JOIN fragments f ON t.to_id = f.id WHERE t.from_id = ? ORDER BY t.created_at DESC')
    .all(fragmentIdUpper) as any[];

  const inboundTraces = db
    .prepare('SELECT t.*, f.module, f.type, f.status FROM traces t JOIN fragments f ON t.from_id = f.id WHERE t.to_id = ? ORDER BY t.created_at DESC')
    .all(fragmentIdUpper) as any[];

  const metaDirectives = db
    .prepare('SELECT meta_id, created_at, directive FROM meta_audit WHERE fragment_id = ? ORDER BY created_at ASC')
    .all(fragmentIdUpper) as Array<{ meta_id: string; created_at: string; directive: string }>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <Link href="/feed" className="btn-base">
          ← Feed
        </Link>
        <Link href="/" className="btn-base">
          Home
        </Link>
      </div>

      {searchParams.recorded === 'true' && (
        <div className="success-banner">
          ✓ Recorded as event.
        </div>
      )}

      {isNew && (
        <div className="success-banner" style={{ backgroundColor: '#d1ecf1', borderColor: '#bee5eb', color: '#0c5460' }}>
          ✓ Witness recorded.
        </div>
      )}

      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
        Fragment: {escapeHtml(fragment.id)}
      </h1>

      <CanonicalPayload
        id={fragment.id}
        created_at={fragment.created_at}
        module={fragment.module}
        type={fragment.type}
        content={fragment.content}
        hash={fragment.hash}
      />

      <WitnessSection witness={witness} />

      {fragment.status === 'SEALED' && fragment.seal_statement && fragment.seal_hash && (
        <SealSection
          fragment={{
            id: fragment.id,
            sealed_at: fragment.sealed_at,
            seal_statement: fragment.seal_statement,
            seal_hash: fragment.seal_hash,
            hash: fragment.hash,
          }}
        />
      )}

      <div style={{ backgroundColor: '#f8f9fa', padding: '1.5rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Meta Directives ({metaDirectives.length})
        </h2>
        {metaDirectives.length === 0 ? (
          <p style={{ color: '#666' }}>No meta directives recorded for this fragment.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {metaDirectives.map((meta) => (
              <div
                key={meta.meta_id}
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <Link
                    href={`/meta/${meta.meta_id}`}
                    style={{ color: '#ff4221', textDecoration: 'none', fontFamily: 'monospace', fontSize: '0.875rem' }}
                  >
                    {escapeHtml(meta.meta_id)}
                  </Link>
                  <span style={{ color: '#666', fontSize: '0.875rem' }}>
                    {new Date(meta.created_at).toLocaleString('zh-TW')}
                  </span>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#1a1a1a' }}>
                  {escapeHtml(meta.directive)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ backgroundColor: '#f8f9fa', padding: '1.5rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <strong>ID:</strong> <code style={{ fontFamily: 'monospace' }}>{escapeHtml(fragment.id)}</code>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <strong>Module:</strong> {escapeHtml(fragment.module)}
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <strong>Type:</strong> {escapeHtml(fragment.type)}
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <strong>Created At:</strong> {new Date(fragment.created_at).toLocaleString('zh-TW')}
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <strong>Status:</strong>{' '}
          <span
            style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '3px',
              fontSize: '0.875rem',
              backgroundColor: fragment.status === 'SEALED' ? '#ff4221' : '#e0e0e0',
              color: fragment.status === 'SEALED' ? 'white' : '#1a1a1a',
            }}
          >
            {fragment.status}
          </span>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <strong>Hash:</strong>{' '}
          <code style={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
            {escapeHtml(fragment.hash)}
          </code>
        </div>
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #ccc' }}>
          <strong>Content:</strong>
          <div
            style={{
              marginTop: '0.5rem',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              lineHeight: '1.6',
            }}
          >
            {escapeHtml(fragment.content)}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Actions</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flexDirection: 'column' }}>
          {fragment.status === 'ACTIVE' && <SealForm fragmentId={fragment.id} />}
          <FragmentForm fragmentId={fragment.id} />
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Outbound Traces ({outboundTraces.length})
        </h2>
        {outboundTraces.length === 0 ? (
          <p style={{ color: '#666' }}>No outbound traces.</p>
        ) : (
          <div style={{ border: '1px solid #e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>To Fragment</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Module</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {outboundTraces.map((trace) => (
                  <tr key={trace.id} style={{ borderTop: '1px solid #e0e0e0' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <Link
                        href={`/f/${trace.to_id}`}
                        style={{ color: '#ff4221', textDecoration: 'none' }}
                      >
                        {escapeHtml(trace.to_id)}
                      </Link>
                    </td>
                    <td style={{ padding: '0.75rem' }}>{escapeHtml(trace.module)}</td>
                    <td style={{ padding: '0.75rem' }}>{escapeHtml(trace.type)}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '3px',
                          fontSize: '0.75rem',
                          backgroundColor: trace.status === 'SEALED' ? '#ff4221' : '#f8f9fa',
                          color: trace.status === 'SEALED' ? 'white' : '#1a1a1a',
                        }}
                      >
                        {trace.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {new Date(trace.created_at).toLocaleString('zh-TW')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Inbound Traces ({inboundTraces.length})
        </h2>
        {inboundTraces.length === 0 ? (
          <p style={{ color: '#666' }}>No inbound traces.</p>
        ) : (
          <div style={{ border: '1px solid #e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>From Fragment</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Module</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {inboundTraces.map((trace) => (
                  <tr key={trace.id} style={{ borderTop: '1px solid #e0e0e0' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <Link
                        href={`/f/${trace.from_id}`}
                        style={{ color: '#ff4221', textDecoration: 'none' }}
                      >
                        {escapeHtml(trace.from_id)}
                      </Link>
                    </td>
                    <td style={{ padding: '0.75rem' }}>{escapeHtml(trace.module)}</td>
                    <td style={{ padding: '0.75rem' }}>{escapeHtml(trace.type)}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '3px',
                          fontSize: '0.75rem',
                          backgroundColor: trace.status === 'SEALED' ? '#ff4221' : '#f8f9fa',
                          color: trace.status === 'SEALED' ? 'white' : '#1a1a1a',
                        }}
                      >
                        {trace.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {new Date(trace.created_at).toLocaleString('zh-TW')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

