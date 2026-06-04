import { getDb } from '@/lib/db';
import Link from 'next/link';
import { escapeHtml } from '@/lib/utils';
import { LanguageToggle } from '@/app/LanguageToggle';
import { ExpandableContent } from './ExpandableContent';

type FeedProps = {
  searchParams: { status?: string };
};

type FragmentWithMeta = {
  id: string;
  module: string;
  type: string;
  status: string;
  created_at: string;
  content: string;
  witnessed: number;
  out_traces: number;
};

export default function FeedPage({ searchParams }: FeedProps) {
  const db = getDb();
  
  // Normalize status filter: default to 'all', accept lowercase
  const statusParam = (searchParams.status || 'all').toLowerCase();
  const statusFilter = statusParam === 'sealed' ? 'SEALED' : statusParam === 'active' ? 'ACTIVE' : 'ALL';

  // Build query with witness and trace counts
  let query = `
    SELECT
      f.id,
      f.module,
      f.type,
      f.status,
      f.created_at,
      f.content,
      CASE WHEN w.fragment_id IS NULL THEN 0 ELSE 1 END AS witnessed,
      COALESCE(t.out_count, 0) AS out_traces
    FROM fragments f
    LEFT JOIN witnesses w ON w.fragment_id = f.id
    LEFT JOIN (
      SELECT from_id, COUNT(*) AS out_count
      FROM traces
      GROUP BY from_id
    ) t ON t.from_id = f.id
  `;

  let params: string[] = [];

  if (statusFilter !== 'ALL') {
    query += ' WHERE f.status = ?';
    params = [statusFilter];
  }

  query += ' ORDER BY f.created_at DESC LIMIT 200';

  const fragments = db.prepare(query).all(...params) as FragmentWithMeta[];

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}/${month}/${day}\n${hours}:${minutes}:${seconds}`;
  }

  function getEmptyMessage(): string {
    if (statusFilter === 'SEALED') return 'No sealed fragments yet.';
    if (statusFilter === 'ACTIVE') return 'No active fragments.';
    return 'No fragments yet.';
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Fragment Feed</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#666', textAlign: 'right' }}>
            Integrity: append-only / write-once seals / first-witness enabled
          </div>
          <LanguageToggle />
          <Link href="/" className="btn-base">
            Home
          </Link>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/feed"
          className={`tab-btn ${statusFilter === 'ALL' ? 'is-active' : ''}`}
        >
          ALL
        </Link>
        <Link
          href="/feed?status=active"
          className={`tab-btn ${statusFilter === 'ACTIVE' ? 'is-active' : ''}`}
        >
          ACTIVE
        </Link>
        <Link
          href="/feed?status=sealed"
          className={`tab-btn ${statusFilter === 'SEALED' ? 'is-active' : ''}`}
        >
          SEALED
        </Link>
      </div>

      <div style={{ border: '1px solid #e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
        {fragments.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
            <div style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{getEmptyMessage()}</div>
            <div style={{ fontSize: '0.875rem', color: '#999' }}>
              {statusFilter === 'ALL' && 'Create your first fragment to get started.'}
            </div>
          </div>
        ) : (
          <table className="feedTable" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                <th className="colCreated" style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', width: '180px', verticalAlign: 'top' }}>Created</th>
                <th className="colModule" style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', width: '120px', verticalAlign: 'top' }}>Module</th>
                <th className="colType" style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', width: '140px', verticalAlign: 'top' }}>Type</th>
                <th className="colStatus" style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', width: '180px', verticalAlign: 'top' }}>Status</th>
                <th className="colContent" style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', verticalAlign: 'top' }}>Content</th>
              </tr>
            </thead>
            <tbody>
              {fragments.map((fragment) => (
                <tr
                  key={fragment.id}
                  className="feed-row"
                  role="row"
                >
                  <td style={{ padding: 0 }}>
                    <Link
                      href={`/f/${fragment.id}`}
                      className="feed-row-link date-mono"
                      style={{ whiteSpace: 'pre-line' }}
                    >
                      {formatDate(fragment.created_at)}
                    </Link>
                  </td>
                  <td style={{ padding: 0 }}>
                    <Link
                      href={`/f/${fragment.id}`}
                      className="feed-row-link"
                    >
                      {escapeHtml(fragment.module)}
                    </Link>
                  </td>
                  <td style={{ padding: 0 }}>
                    <Link
                      href={`/f/${fragment.id}`}
                      className="feed-row-link"
                    >
                      {escapeHtml(fragment.type)}
                    </Link>
                  </td>
                  <td style={{ padding: 0, verticalAlign: 'top' }}>
                    <Link
                      href={`/f/${fragment.id}`}
                      className="feed-row-link"
                    >
                      <div className="badgeStack">
                        {fragment.status === 'SEALED' ? (
                          <span className="badge sealed">SEALED</span>
                        ) : (
                          <span className="badge active">ACTIVE</span>
                        )}
                        {fragment.witnessed === 1 && (
                          <span className="badge meta">WITNESSED</span>
                        )}
                        {fragment.out_traces > 0 && (
                          <span className="badge meta">TRACED</span>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="contentCell" style={{ padding: 0, verticalAlign: 'top' }}>
                    <div style={{ padding: '0.75rem' }}>
                      <ExpandableContent
                        content={escapeHtml(fragment.content)}
                        fragmentId={fragment.id}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
