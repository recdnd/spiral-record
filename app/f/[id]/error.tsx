'use client';

import { useEffect } from 'react';
import Link from 'next/link';


export default function FragmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ff4221' }}>
        Failed to load fragment
      </h1>
      <p style={{ marginBottom: '2rem', color: '#666' }}>
        {error?.message || 'An unexpected error occurred while loading the fragment'}
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '2rem' }}>
        <button onClick={reset} className="btn-base">
          Try again
        </button>
        <Link href="/feed" className="btn-base">
          ← Feed
        </Link>
        <Link href="/" className="btn-base">
          Home
        </Link>
      </div>
      {process.env.NODE_ENV === 'development' && error?.stack && (
        <details style={{ marginTop: '2rem', textAlign: 'left' }}>
          <summary style={{ cursor: 'pointer', marginBottom: '1rem' }}>Error details</summary>
          <pre style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px', overflow: 'auto', fontSize: '0.875rem' }}>
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
}

