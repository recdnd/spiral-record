'use client';

import { useState } from 'react';
import { addTraces } from '@/app/actions';

export function FragmentForm({ fragmentId }: { fragmentId: string }) {
  const [traceIds, setTraceIds] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const ids = traceIds
      .split(/[,\s]+/)
      .map(id => id.trim().toUpperCase())
      .filter(id => id.length > 0);

    const result = await addTraces(fragmentId, ids);

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(
        result.added && result.added.length > 0
          ? `Added ${result.added.length} trace(s): ${result.added.join(', ')}`
          : 'Traces added'
      );
      if (result.errors && result.errors.length > 0) {
        setError(result.errors.join('; '));
      }
      setTraceIds('');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn-base"
      >
        Add Trace
      </button>
    );
  }

  return (
    <div style={{ border: '1px solid #e0e0e0', padding: '1rem', borderRadius: '4px', backgroundColor: '#f8f9fa' }}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '0.5rem' }}>
          <label htmlFor="trace-ids" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
            Fragment IDs (comma-separated):
          </label>
          <input
            type="text"
            id="trace-ids"
            value={traceIds}
            onChange={(e) => setTraceIds(e.target.value)}
            className="input-base"
            style={{ width: '100%' }}
            placeholder="FRAG-20260114-8F3A, FRAG-20260114-9B2C"
            disabled={isSubmitting}
          />
        </div>
        {error && <div className="error-banner" style={{ marginTop: '0.5rem' }}>{error}</div>}
        {success && <div className="success-banner" style={{ marginTop: '0.5rem' }}>{success}</div>}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button
            type="submit"
            className="btn-base"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setError(null);
              setSuccess(null);
              setTraceIds('');
            }}
            className="btn-base"
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

