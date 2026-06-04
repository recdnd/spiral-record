import { getDb } from '@/lib/db';
import Link from 'next/link';

type MetaAuditRow = {
  meta_id: string;
  created_at: string;
  module: string;
  fragment_id: string | null;
  directive: string;
};

export default function MetaPage() {
  const db = getDb();
  const metaList = db
    .prepare(
      `SELECT meta_id, created_at, module, fragment_id, directive 
       FROM meta_audit 
       ORDER BY created_at DESC 
       LIMIT 100`
    )
    .all() as MetaAuditRow[];

  return (
    <div className="container">
      <header>
        <h1>Meta Audit Log</h1>
        <p className="meta">Spiral meta directives (𖡎:) recorded but never enter fragment content.</p>
      </header>

      {metaList.length === 0 ? (
        <div className="empty-state">
          <p>No meta directives recorded yet.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Created</th>
                <th>Module</th>
                <th>Meta ID</th>
                <th>Fragment</th>
                <th>Directive</th>
              </tr>
            </thead>
            <tbody>
              {metaList.map((meta) => (
                <tr key={meta.meta_id}>
                  <td className="date-mono">{new Date(meta.created_at).toLocaleString()}</td>
                  <td>{meta.module}</td>
                  <td>
                    <Link href={`/meta/${meta.meta_id}`} className="link">
                      {meta.meta_id}
                    </Link>
                  </td>
                  <td>
                    {meta.fragment_id ? (
                      <Link href={`/f/${meta.fragment_id}`} className="link">
                        {meta.fragment_id}
                      </Link>
                    ) : (
                      <span className="meta">—</span>
                    )}
                  </td>
                  <td className="content-clamp">{meta.directive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <nav className="nav-links">
        <Link href="/" className="link">Home</Link>
        <Link href="/feed" className="link">Feed</Link>
      </nav>
    </div>
  );
}

