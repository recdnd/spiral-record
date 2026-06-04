'use client';

import { useState } from 'react';
import { sealFragment } from '@/app/actions';

export function SealForm({ fragmentId }: { fragmentId: string }) {
  const [sealStatement, setSealStatement] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const trimmedLength = sealStatement.trim().length;
  const isValid = trimmedLength >= 1 && trimmedLength <= 140;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await sealFragment(fragmentId, formData);

    if (result?.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      // Success - page will reload via revalidation
      window.location.reload();
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn-base"
      >
        Seal with statement
      </button>
    );
  }

  return (
    <div style={{ border: '1px solid #e0e0e0', padding: '1rem', borderRadius: '4px', backgroundColor: '#f8f9fa', marginBottom: '1rem' }}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="seal_statement" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Seal Statement (required, 1-140 characters):
          </label>
          <input
            type="text"
            id="seal_statement"
            name="seal_statement"
            value={sealStatement}
            onChange={(e) => setSealStatement(e.target.value)}
            className="input-base"
            style={{ width: '100%' }}
            maxLength={140}
            required
            placeholder="Enter your seal statement..."
          />
          <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
            {trimmedLength}/140 characters
            {!isValid && trimmedLength > 0 && (
              <span style={{ color: '#dc3545', marginLeft: '0.5rem' }}>
                {trimmedLength === 0 ? 'Statement cannot be empty' : 'Statement exceeds 140 characters'}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem', fontStyle: 'italic' }}>
            Sealing is irreversible. You must leave a seal statement.
          </div>
        </div>

        {error && <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="submit"
            className="btn-base"
            disabled={isSubmitting || !isValid}
          >
            {isSubmitting ? 'Sealing...' : 'SEAL'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setError(null);
              setSealStatement('');
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
