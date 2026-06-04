'use client';

import { useState } from 'react';
import Link from 'next/link';
import { escapeHtml } from '@/lib/utils';

type VerifyResult = {
  ok: boolean;
  status: 'VALID' | 'INVALID' | 'NOT_FOUND' | 'PARSE_ERROR';
  fragment_id?: string;
  computed_hash?: string;
  expected_hash?: string;
  mismatch_reason?: string;
  error?: string;
};

export default function VerifyPage() {
  const [payloadInput, setPayloadInput] = useState('');
  const [fragmentId, setFragmentId] = useState('');
  const [expectedHash, setExpectedHash] = useState('');
  const [expectedSealHash, setExpectedSealHash] = useState('');
  const [expectedWitnessHash, setExpectedWitnessHash] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  async function verifyPayload() {
    if (!payloadInput.trim()) {
      setResult({ ok: false, status: 'PARSE_ERROR', error: 'Payload input is required' });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'payload',
          payload_input: payloadInput,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ ok: false, status: 'PARSE_ERROR', error: error.message });
    } finally {
      setIsVerifying(false);
    }
  }

  async function verifyIdHash() {
    if (!fragmentId.trim() || !expectedHash.trim()) {
      setResult({ ok: false, status: 'PARSE_ERROR', error: 'Fragment ID and hash are required' });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'id_hash',
          fragment_id: fragmentId,
          expected_hash: expectedHash,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ ok: false, status: 'PARSE_ERROR', error: error.message });
    } finally {
      setIsVerifying(false);
    }
  }

  async function verifySeal() {
    if (!fragmentId.trim() || !expectedSealHash.trim()) {
      setResult({ ok: false, status: 'PARSE_ERROR', error: 'Fragment ID and seal hash are required' });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'seal',
          fragment_id: fragmentId,
          expected_seal_hash: expectedSealHash,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ ok: false, status: 'PARSE_ERROR', error: error.message });
    } finally {
      setIsVerifying(false);
    }
  }

  async function verifyWitness() {
    if (!fragmentId.trim() || !expectedWitnessHash.trim()) {
      setResult({ ok: false, status: 'PARSE_ERROR', error: 'Fragment ID and witness hash are required' });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'witness',
          fragment_id: fragmentId,
          expected_witness_hash: expectedWitnessHash,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ ok: false, status: 'PARSE_ERROR', error: error.message });
    } finally {
      setIsVerifying(false);
    }
  }

  function getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'VALID':
        return 'badge sealed';
      case 'INVALID':
        return 'badge active';
      case 'NOT_FOUND':
        return 'badge meta';
      case 'PARSE_ERROR':
        return 'badge meta';
      default:
        return 'badge meta';
    }
  }

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

      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Verify Integrity</h1>
      
      <p style={{ marginBottom: '2rem', color: '#666', lineHeight: '1.6' }}>
        Paste a canonical payload or provide fragment id + hash. This page verifies against the stored record.
      </p>

      <div style={{ display: 'grid', gap: '2rem', marginBottom: '2rem' }}>
        {/* Verify by Canonical Payload */}
        <div style={{ border: '1px solid #e0e0e0', padding: '1.5rem', borderRadius: '4px', backgroundColor: '#f8f9fa' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
            Verify by Canonical Payload
          </h2>
          <textarea
            value={payloadInput}
            onChange={(e) => setPayloadInput(e.target.value)}
            className="input-base"
            style={{ width: '100%', minHeight: '200px', fontFamily: 'monospace', fontSize: '0.875rem' }}
            placeholder={`--- CANONICAL PAYLOAD ---
id: FRAG-YYYYMMDD-XXXX
created_at: 2026-01-14T21:42:11Z
module: rec
type: claim
content:
Your content here
--- END PAYLOAD ---`}
          />
          <button
            onClick={verifyPayload}
            className="btn-base"
            style={{ marginTop: '1rem' }}
            disabled={isVerifying}
          >
            {isVerifying ? 'Verifying...' : 'Verify Payload'}
          </button>
        </div>

        {/* Verify by ID + Hash */}
        <div style={{ border: '1px solid #e0e0e0', padding: '1.5rem', borderRadius: '4px', backgroundColor: '#f8f9fa' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
            Verify by ID + Hash
          </h2>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="fragment_id" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Fragment ID
            </label>
            <input
              type="text"
              id="fragment_id"
              value={fragmentId}
              onChange={(e) => setFragmentId(e.target.value.toUpperCase())}
              className="input-base"
              style={{ width: '100%', fontFamily: 'monospace' }}
              placeholder="FRAG-20260114-8F3A"
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="expected_hash" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Expected Hash
            </label>
            <input
              type="text"
              id="expected_hash"
              value={expectedHash}
              onChange={(e) => setExpectedHash(e.target.value)}
              className="input-base"
              style={{ width: '100%', fontFamily: 'monospace' }}
              placeholder="sha256 hash"
            />
          </div>
          <button
            onClick={verifyIdHash}
            className="btn-base"
            disabled={isVerifying}
          >
            {isVerifying ? 'Verifying...' : 'Verify ID + Hash'}
          </button>
        </div>

        {/* Verify Seal */}
        <div style={{ border: '1px solid #e0e0e0', padding: '1.5rem', borderRadius: '4px', backgroundColor: '#f8f9fa' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
            Verify Seal
          </h2>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="seal_fragment_id" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Fragment ID
            </label>
            <input
              type="text"
              id="seal_fragment_id"
              value={fragmentId}
              onChange={(e) => setFragmentId(e.target.value.toUpperCase())}
              className="input-base"
              style={{ width: '100%', fontFamily: 'monospace' }}
              placeholder="FRAG-20260114-8F3A"
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="expected_seal_hash" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Expected Seal Hash
            </label>
            <input
              type="text"
              id="expected_seal_hash"
              value={expectedSealHash}
              onChange={(e) => setExpectedSealHash(e.target.value)}
              className="input-base"
              style={{ width: '100%', fontFamily: 'monospace' }}
              placeholder="seal hash"
            />
          </div>
          <button
            onClick={verifySeal}
            className="btn-base"
            disabled={isVerifying}
          >
            {isVerifying ? 'Verifying...' : 'Verify Seal'}
          </button>
        </div>

        {/* Verify Witness */}
        <div style={{ border: '1px solid #e0e0e0', padding: '1.5rem', borderRadius: '4px', backgroundColor: '#f8f9fa' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
            Verify Witness
          </h2>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="witness_fragment_id" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Fragment ID
            </label>
            <input
              type="text"
              id="witness_fragment_id"
              value={fragmentId}
              onChange={(e) => setFragmentId(e.target.value.toUpperCase())}
              className="input-base"
              style={{ width: '100%', fontFamily: 'monospace' }}
              placeholder="FRAG-20260114-8F3A"
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="expected_witness_hash" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Expected Witness Hash
            </label>
            <input
              type="text"
              id="expected_witness_hash"
              value={expectedWitnessHash}
              onChange={(e) => setExpectedWitnessHash(e.target.value)}
              className="input-base"
              style={{ width: '100%', fontFamily: 'monospace' }}
              placeholder="witness hash"
            />
          </div>
          <button
            onClick={verifyWitness}
            className="btn-base"
            disabled={isVerifying}
          >
            {isVerifying ? 'Verifying...' : 'Verify Witness'}
          </button>
        </div>
      </div>

      {/* Result Area */}
      {result && (
        <div
          style={{
            border: '2px solid #e0e0e0',
            padding: '1.5rem',
            borderRadius: '4px',
            backgroundColor: '#fff',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
          }}
        >
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <strong>Status:</strong>
            <span className={getStatusBadgeClass(result.status)}>{result.status}</span>
          </div>

          {result.fragment_id && (
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Fragment ID:</strong> {escapeHtml(result.fragment_id)}
            </div>
          )}

          {result.computed_hash && (
            <div style={{ marginBottom: '0.5rem', wordBreak: 'break-all' }}>
              <strong>Computed Hash:</strong> {escapeHtml(result.computed_hash)}
            </div>
          )}

          {result.expected_hash && (
            <div style={{ marginBottom: '0.5rem', wordBreak: 'break-all' }}>
              <strong>Expected Hash:</strong> {escapeHtml(result.expected_hash)}
            </div>
          )}

          {result.mismatch_reason && (
            <div style={{ marginBottom: '0.5rem', color: '#666' }}>
              <strong>Reason:</strong> {escapeHtml(result.mismatch_reason)}
            </div>
          )}

          {result.error && (
            <div style={{ marginTop: '0.5rem', color: '#666' }}>
              <strong>Error:</strong> {escapeHtml(result.error)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

