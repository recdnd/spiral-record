'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function HomeForm() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await fetch('/api/fragments', {
        method: 'POST',
        body: formData,
      });

      // Check content-type to ensure we got JSON
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Non-JSON response: ${text.slice(0, 120)}`);
      }

      const data = await response.json();

      // Handle error responses
      if (!response.ok || !data.ok) {
        setError(data.error || 'Failed to create fragment');
        setIsSubmitting(false);
        return;
      }

      // Success: navigate to fragment page
      router.push(`/f/${data.id}?recorded=true`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit fragment');
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="module" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Module
        </label>
        <input
          type="text"
          id="module"
          name="module"
          defaultValue="anon"
          className="input-base"
          style={{ width: '100%' }}
          maxLength={32}
          pattern="[a-zA-Z0-9_-]+"
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="type" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Type
        </label>
        <select
          id="type"
          name="type"
          className="input-base"
          style={{ width: '100%' }}
          defaultValue="note"
        >
          <option value="claim">claim</option>
          <option value="promise">promise</option>
          <option value="definition">definition</option>
          <option value="confession">confession</option>
          <option value="note">note</option>
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="content" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Content
        </label>
        <textarea
          id="content"
          name="content"
          className="input-base"
          style={{ width: '100%', minHeight: '150px', fontFamily: 'inherit' }}
          required
          maxLength={4000}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="traces" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Trace (optional, comma-separated fragment IDs)
        </label>
        <input
          type="text"
          id="traces"
          name="traces"
          className="input-base"
          style={{ width: '100%' }}
          placeholder="FRAG-20260114-8F3A, FRAG-20260114-9B2C"
        />
      </div>

      {error && <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="warning-banner">
        <strong>⚠️ Irreversible:</strong> You cannot edit this after submission.
      </div>

      <button
        type="submit"
        className="btn-base"
        style={{ marginTop: '1rem', width: '100%' }}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Fragment'}
      </button>

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <a href="/feed" className="btn-base">
          View Feed
        </a>
      </div>
    </form>
  );
}

