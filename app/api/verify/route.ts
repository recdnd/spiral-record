import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { computeHash, computeSealHash, computeWitnessHash, computeMetaHash, validateFragmentId } from '@/lib/utils';
import { parseCanonicalPayload, ParseError } from '@/lib/canonical-parser';

type VerifyRequest = {
  mode: 'payload' | 'id_hash' | 'seal' | 'witness' | 'meta';
  payload_input?: string;
  fragment_id?: string;
  meta_id?: string;
  expected_hash?: string;
  expected_seal_hash?: string;
  expected_witness_hash?: string;
  expected_meta_hash?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body: VerifyRequest = await req.json();
    const { mode } = body;
    
    const db = getDb();
    
    if (mode === 'payload') {
      if (!body.payload_input) {
        return NextResponse.json(
          { ok: false, status: 'PARSE_ERROR', error: 'payload_input is required' },
          { status: 400 }
        );
      }
      
      let parsed;
      try {
        parsed = parseCanonicalPayload(body.payload_input);
      } catch (error) {
        if (error instanceof ParseError) {
          return NextResponse.json({
            ok: false,
            status: 'PARSE_ERROR',
            error: error.message,
          });
        }
        throw error;
      }
      
      // Compute hash from payload
      const computedHash = computeHash(
        parsed.id,
        parsed.created_at,
        parsed.module,
        parsed.type,
        parsed.content
      );
      
      // Look up fragment in DB
      const fragment = db.prepare('SELECT hash FROM fragments WHERE id = ?').get(parsed.id) as { hash: string } | undefined;
      
      if (!fragment) {
        return NextResponse.json({
          ok: false,
          status: 'NOT_FOUND',
          fragment_id: parsed.id,
          computed_hash: computedHash,
          error: 'Fragment not found in database',
        });
      }
      
      const isValid = computedHash.toLowerCase() === fragment.hash.toLowerCase();
      
      return NextResponse.json({
        ok: isValid,
        status: isValid ? 'VALID' : 'INVALID',
        fragment_id: parsed.id,
        computed_hash: computedHash,
        expected_hash: fragment.hash,
        mismatch_reason: isValid ? undefined : 'Computed hash does not match stored hash',
      });
    }
    
    if (mode === 'id_hash') {
      if (!body.fragment_id || !body.expected_hash) {
        return NextResponse.json(
          { ok: false, status: 'PARSE_ERROR', error: 'fragment_id and expected_hash are required' },
          { status: 400 }
        );
      }
      
      const fragmentId = body.fragment_id.toUpperCase();
      if (!validateFragmentId(fragmentId)) {
        return NextResponse.json({
          ok: false,
          status: 'PARSE_ERROR',
          error: 'Invalid fragment ID format',
        });
      }
      
      const fragment = db.prepare('SELECT * FROM fragments WHERE id = ?').get(fragmentId) as any;
      
      if (!fragment) {
        return NextResponse.json({
          ok: false,
          status: 'NOT_FOUND',
          fragment_id: fragmentId,
          error: 'Fragment not found in database',
        });
      }
      
      // Compute hash from DB values
      const computedHash = computeHash(
        fragment.id,
        fragment.created_at,
        fragment.module,
        fragment.type,
        fragment.content
      );
      
      const isValid = computedHash.toLowerCase() === body.expected_hash.toLowerCase();
      
      return NextResponse.json({
        ok: isValid,
        status: isValid ? 'VALID' : 'INVALID',
        fragment_id: fragmentId,
        computed_hash: computedHash,
        expected_hash: body.expected_hash,
        mismatch_reason: isValid ? undefined : 'Computed hash does not match provided hash',
      });
    }
    
    if (mode === 'seal') {
      if (!body.fragment_id || !body.expected_seal_hash) {
        return NextResponse.json(
          { ok: false, status: 'PARSE_ERROR', error: 'fragment_id and expected_seal_hash are required' },
          { status: 400 }
        );
      }
      
      const fragmentId = body.fragment_id.toUpperCase();
      if (!validateFragmentId(fragmentId)) {
        return NextResponse.json({
          ok: false,
          status: 'PARSE_ERROR',
          error: 'Invalid fragment ID format',
        });
      }
      
      const fragment = db.prepare('SELECT * FROM fragments WHERE id = ?').get(fragmentId) as any;
      
      if (!fragment) {
        return NextResponse.json({
          ok: false,
          status: 'NOT_FOUND',
          fragment_id: fragmentId,
          error: 'Fragment not found in database',
        });
      }
      
      if (!fragment.seal_statement || !fragment.sealed_at || !fragment.seal_hash) {
        return NextResponse.json({
          ok: false,
          status: 'NOT_FOUND',
          fragment_id: fragmentId,
          error: 'Fragment is not sealed',
        });
      }
      
      // Compute seal hash (fragment_id|sealed_at|fragment_hash|seal_statement)
      const computedSealHash = computeSealHash(
        fragment.id,
        fragment.sealed_at,
        fragment.hash,
        fragment.seal_statement
      );
      
      const isValid = computedSealHash.toLowerCase() === body.expected_seal_hash.toLowerCase();
      
      return NextResponse.json({
        ok: isValid,
        status: isValid ? 'VALID' : 'INVALID',
        fragment_id: fragmentId,
        computed_hash: computedSealHash,
        expected_hash: body.expected_seal_hash,
        mismatch_reason: isValid ? undefined : 'Computed seal hash does not match provided hash',
      });
    }
    
    if (mode === 'witness') {
      if (!body.fragment_id || !body.expected_witness_hash) {
        return NextResponse.json(
          { ok: false, status: 'PARSE_ERROR', error: 'fragment_id and expected_witness_hash are required' },
          { status: 400 }
        );
      }
      
      const fragmentId = body.fragment_id.toUpperCase();
      if (!validateFragmentId(fragmentId)) {
        return NextResponse.json({
          ok: false,
          status: 'PARSE_ERROR',
          error: 'Invalid fragment ID format',
        });
      }
      
      const witness = db.prepare('SELECT * FROM witnesses WHERE fragment_id = ?').get(fragmentId) as any;
      
      if (!witness) {
        return NextResponse.json({
          ok: false,
          status: 'NOT_FOUND',
          fragment_id: fragmentId,
          error: 'Witness record not found',
        });
      }
      
      // Compute witness hash
      const computedWitnessHash = computeWitnessHash(
        witness.fragment_id,
        witness.witnessed_at,
        witness.fragment_hash
      );
      
      const isValid = computedWitnessHash.toLowerCase() === body.expected_witness_hash.toLowerCase();
      
      return NextResponse.json({
        ok: isValid,
        status: isValid ? 'VALID' : 'INVALID',
        fragment_id: fragmentId,
        computed_hash: computedWitnessHash,
        expected_hash: body.expected_witness_hash,
        mismatch_reason: isValid ? undefined : 'Computed witness hash does not match provided hash',
      });
    }
    
    if (mode === 'meta') {
      if (!body.meta_id || !body.expected_meta_hash) {
        return NextResponse.json(
          { ok: false, status: 'PARSE_ERROR', error: 'meta_id and expected_meta_hash are required' },
          { status: 400 }
        );
      }

      const metaId = body.meta_id.toUpperCase();
      if (!/^META-\d{8}-[0-9A-F]{4}$/.test(metaId)) {
        return NextResponse.json({
          ok: false,
          status: 'PARSE_ERROR',
          error: 'Invalid meta ID format',
        });
      }

      const meta = db.prepare('SELECT * FROM meta_audit WHERE meta_id = ?').get(metaId) as any;

      if (!meta) {
        return NextResponse.json({
          ok: false,
          status: 'NOT_FOUND',
          meta_id: metaId,
          error: 'Meta audit record not found',
        });
      }

      // Compute meta hash from stored values
      const computedMetaHash = computeMetaHash(
        meta.meta_id,
        meta.created_at,
        meta.source,
        meta.module,
        meta.fragment_id,
        meta.directive,
        meta.raw_line
      );

      const isValid = computedMetaHash.toLowerCase() === body.expected_meta_hash.toLowerCase();

      return NextResponse.json({
        ok: isValid,
        status: isValid ? 'VALID' : 'INVALID',
        meta_id: metaId,
        computed_hash: computedMetaHash,
        expected_hash: body.expected_meta_hash,
        mismatch_reason: isValid ? undefined : 'Computed meta hash does not match provided hash',
      });
    }
    
    return NextResponse.json(
      { ok: false, status: 'PARSE_ERROR', error: 'Invalid mode' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, status: 'PARSE_ERROR', error: error.message || 'Verification failed' },
      { status: 500 }
    );
  }
}

