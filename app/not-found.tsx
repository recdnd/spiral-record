'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>404 - Fragment Not Found</h1>
      <p style={{ marginBottom: '2rem', color: '#666' }}>
        The fragment you are looking for does not exist.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
        <Link href="/feed" className="btn-base">
          View Feed
        </Link>
        <Link href="/" className="btn-base">
          Home
        </Link>
      </div>
    </div>
  );
}

