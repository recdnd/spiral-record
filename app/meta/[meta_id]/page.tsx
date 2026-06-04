import { getDb } from '@/lib/db';
import { buildCanonicalMetaPayload } from '@/lib/canonical';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CopyButtons } from './CopyButtons';

type MetaDetailPageProps = {
  params: {
    meta_id: string;
  };
};

type MetaAuditRow = {
  id: number;
  meta_id: string;
  created_at: string;
  source: 'submission' | 'system';
  module: string;
  fragment_id: string | null;
  directive: string;
  raw_line: string;
  meta_hash: string;
};

export default function MetaDetailPage({ params }: MetaDetailPageProps) {
  const db = getDb();
  const meta = db
    .prepare('SELECT * FROM meta_audit WHERE meta_id = ?')
    .get(params.meta_id.toUpperCase()) as MetaAuditRow | undefined;

  if (!meta) {
    notFound();
  }

  const canonicalPayload = buildCanonicalMetaPayload(meta);

  return (
    <div className="container">
      <header>
        <h1>Meta Directive: {meta.meta_id}</h1>
        <p className="meta">Control language recorded but never enters fragment content.</p>
      </header>

      <section className="section">
        <h2>Details</h2>
        <dl className="detail-list">
          <dt>Meta ID</dt>
          <dd className="mono">{meta.meta_id}</dd>
          
          <dt>Created At</dt>
          <dd className="date-mono">{new Date(meta.created_at).toISOString()}</dd>
          
          <dt>Source</dt>
          <dd>{meta.source}</dd>
          
          <dt>Module</dt>
          <dd>{meta.module}</dd>
          
          <dt>Fragment ID</dt>
          <dd>
            {meta.fragment_id ? (
              <Link href={`/f/${meta.fragment_id}`} className="link">
                {meta.fragment_id}
              </Link>
            ) : (
              <span className="meta">—</span>
            )}
          </dd>
          
          <dt>Directive</dt>
          <dd className="mono">{meta.directive}</dd>
          
          <dt>Raw Line</dt>
          <dd className="mono pre-wrap">{meta.raw_line}</dd>
          
          <dt>Meta Hash</dt>
          <dd className="mono small">{meta.meta_hash}</dd>
        </dl>
      </section>

      <section className="section">
        <h2>Canonical Meta Payload</h2>
        <div className="payload-block">
          <pre className="mono pre-wrap">{canonicalPayload}</pre>
          <CopyButtons payload={canonicalPayload} hash={meta.meta_hash} />
        </div>
      </section>

      <nav className="nav-links">
        <Link href="/meta" className="link">← Meta Audit Log</Link>
        {meta.fragment_id && (
          <Link href={`/f/${meta.fragment_id}`} className="link">View Fragment</Link>
        )}
        <Link href="/feed" className="link">Feed</Link>
      </nav>
    </div>
  );
}

