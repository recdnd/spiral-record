# Spiral Record — Design Rationale & Invariants

## Purpose

Spiral Record is not a note-taking tool, a draft system, or a collaborative workspace. It treats language as an irreversible event. The system exists to enforce properties, not to optimize interaction. Every fragment submitted becomes a permanent record that cannot be altered, deleted, or reinterpreted after creation. The system's purpose is to preserve integrity, not convenience.

## Core Concepts

### Fragment

A fragment is an immutable unit of recorded language. It consists of an identifier, creation timestamp, module name, type classification, and content. Once created, a fragment's content cannot be modified. The only allowed mutations after creation are sealing (status change) and adding trace references (append-only relationships).

### Trace

A trace is a unidirectional reference from one fragment to another. Traces are append-only: they can be added but never removed. Traces create a directed graph of relationships between fragments without modifying the fragments themselves.

### Seal

A seal is a write-once, irreversible status change that marks a fragment as final. Sealing requires a seal statement and generates a cryptographic hash over the seal payload. Once sealed, a fragment cannot be unsealed. Sealing does not prevent adding new traces.

### Witness

A witness is a record created when a fragment is viewed for the first time globally. Each fragment can have at most one witness record. The witness captures the fragment's hash at the moment of first view and generates a cryptographic hash over the witness payload. Witness creation is race-safe and idempotent.

### Canonical Payload

A canonical payload is a deterministic string representation of a fragment's core data. The format is fixed: fields appear in a specific order, and content is preserved exactly as stored. The canonical payload is used to compute cryptographic hashes that enable independent verification of integrity.

### Verification

Verification is the process of recomputing a cryptographic hash from stored or provided data and comparing it to a claimed hash value. Verification is a read-only operation that never mutates system state. It enables third parties to independently confirm data integrity without trusting the system's internal state.

## Invariants

Invariant: Fragments are append-only. No fragment content, metadata, or identifier can be modified after creation.

Invariant: Fragment content is never edited or deleted. The content field stores exactly what was submitted, with only trailing whitespace trimmed.

Invariant: Canonical payload hashing is deterministic. Given the same inputs in the same order, the hash computation must produce identical results across all implementations and time periods.

Invariant: Seal is write-once and irreversible. A fragment can be sealed exactly once. Once sealed, the seal statement, seal timestamp, and seal hash cannot be changed.

Invariant: Witness is generated at most once per fragment. The first view of a fragment creates a witness record. Subsequent views do not create additional witness records.

Invariant: Verification never mutates state. All verification operations are read-only. Verification cannot create, modify, or delete any data.

Invariant: UI must not allow actions that violate invariants. The user interface must prevent any operation that would break an invariant, even if such prevention reduces convenience.

Invariant: Hash computation uses exact stored values. When computing hashes for verification, the system must use values exactly as stored in the database, not values derived from UI state or reformatted representations.

Invariant: Trace references are append-only. Traces can be added but never removed. Duplicate traces are prevented at insertion time.

Invariant: Fragment identifiers are unique and immutable. Once assigned, a fragment ID cannot be changed or reused.

## What This System Refuses to Do

This system refuses to support editing historical records. Once a fragment is created, its content is permanent. This refusal exists because editing would break the integrity guarantee that enables independent verification.

This system refuses to support soft deletes. Fragments cannot be marked as deleted or hidden. This refusal exists because deletion would create ambiguity about system state and break the append-only guarantee.

This system refuses to support "undo" operations. Actions are irreversible by design. This refusal exists because reversibility would require mutable state, which conflicts with the system's integrity model.

This system refuses to support user-specific truth. All fragments are visible to all users. There are no private fragments, no access controls, and no user-specific views. This refusal exists because the system treats language as a public, verifiable event.

This system refuses to support mutable authorship. Fragment creators are not tracked, and authorship cannot be changed. This refusal exists because authorship tracking would require authentication, which is explicitly out of scope.

This system refuses to support silent state changes. All mutations are explicit and visible. The system does not perform automatic cleanup, archival, or background modifications. This refusal exists because silent changes would break the verification model.

## Threat Model

This system is designed to prevent silent mutation of stored data. It protects against accidental or malicious modification of fragment content after creation. The cryptographic hashes enable detection of any changes to stored data.

This system is designed to prevent unverifiable claims. The canonical payload format and hash computation are documented and deterministic, enabling third-party verification without trusting the system's internal state.

This system does NOT attempt to protect against malicious database administrators. If an attacker has direct database access, they can modify data. The system's protection is at the application layer, not the storage layer.

This system does NOT attempt to protect against OS-level compromise. If the operating system or file system is compromised, the SQLite database can be modified directly. The system assumes the execution environment is trusted.

This system does NOT attempt to protect against network-based attacks during data transmission. It assumes secure transport or local-only operation.

## Verification Philosophy

Cryptographic hashes exist to enable independent verification. They allow any party to recompute a hash from publicly available data and compare it to a claimed hash value. This enables verification without trusting the system that stored the data.

Verification is separate from creation because integrity must be provable after the fact. The ability to verify a fragment's integrity days, months, or years after creation is essential to the system's purpose.

Third-party recomputation matters because it removes the need to trust the system's internal state. If a fragment's integrity can only be verified by the system that created it, the verification is meaningless.

No trust in UI is assumed. The user interface is a convenience layer, not a source of truth. All integrity claims must be verifiable by examining stored data and recomputing hashes independently.

Any integrity claim must survive outside this system. If the Spiral Record application is deleted, the data and verification logic should be sufficient to prove integrity using external tools.

## Relationship to UI

The user interface is intentionally minimal. It exists only to expose system state, not to reinterpret or transform it. The UI displays data exactly as stored, with no formatting that could obscure the underlying representation.

The UI must never mask or reinterpret stored data. What the user sees must correspond directly to what is stored in the database. Any transformation applied for display must be reversible and documented.

The UI must never allow actions that violate invariants. If an operation would break an invariant, the UI must prevent it, even if this reduces user convenience. The UI serves the system's rules, not user preferences.

## Change Policy

New features may be added only if they do not violate invariants. Any feature that requires weakening an invariant is incompatible with the system's purpose.

Any change that weakens an invariant is a breaking change. Such changes require explicit revision of this document and acknowledgment that the system's integrity model has been altered.

Invariants require explicit revision, not silent drift. If an invariant becomes impractical or incorrect, it must be explicitly removed or modified in this document. Invariants cannot be weakened through implementation changes alone.

Implementation details may change, but invariants must remain stable. The system may be rewritten in different technologies, but the core rules defined here must persist.

