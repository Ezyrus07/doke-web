# PAY-A15 — Identity issuer lifecycle, signed status and retention handoff

## Status

Repository-only contract. No external identity provider, status endpoint, revocation endpoint, archive, staging database, production system or financial provider is contacted.

## Root cause

PAY-A14 verifies externally attested approver identities and immutable governance decision evidence. It did not yet govern the issuer itself after onboarding: an issuer could later be suspended, revoked or retired while an otherwise valid short-lived credential still appeared acceptable. It also lacked an immutable issuer-status chain, signed freshness snapshots and a hashes-only retention handoff.

PAY-A15 closes that boundary without registering a real issuer or invalidating a real credential.

## Canonical contracts

- `pay-a15-identity-issuer-lifecycle-v1`
- `pay-external-identity-issuer-record-v1`
- `pay-external-identity-issuer-lifecycle-event-v1`
- `pay-external-identity-issuer-status-snapshot-v1`
- `pay-identity-status-detached-signature-v1`
- `pay-verified-identity-issuer-status-v1`
- `pay-identity-credential-acceptance-v1`
- `pay-identity-credential-invalidation-v1`
- `pay-identity-audit-retention-handoff-v1`
- `pay-identity-issuer-status-chain-v1`
- `doke-pay-identity-issuer-status-v1`

## Issuer lifecycle

Every issuer begins in `pending`. The allowlisted states are:

```text
pending → active
active → suspended | revoked | retired
suspended → active | revoked | retired
revoked → terminal
retired → terminal
```

Activation requires `onboarding_approved`. Suspension requires `security_incident` or `compliance_hold`. Reactivation requires `remediation_complete` or `periodic_review_passed`. Revocation and retirement have separate low-cardinality reason codes.

Each lifecycle event binds the issuer hash, A14 trust-bundle fingerprint, previous state, next state, sequence, predecessor hash, evidence hash and effective time. Sequences must be contiguous. Replays, forks, crossed issuers, status gaps and mutation of historical events are rejected.

## Signed status snapshot

A credential may be accepted only with an offline-verified status snapshot no older than 900 seconds. The snapshot is bound to the exact issuer record and the current lifecycle-event hash.

Both Ed25519 and RSA-PSS-SHA256 detached signatures are supported. The signing root must be active, inside its validity window, allow the `governance_evidence` purpose and allowlist the signer hash. Revoked roots, stale snapshots, invalid payload hashes, invalid signatures and replayed envelopes are rejected.

## Credential acceptance and invalidation

A PAY-A14 identity credential is accepted only when:

- the verified identity and raw attestation fingerprints match;
- issuer and subject hashes match;
- role and assurance level remain allowlisted;
- the issuer snapshot is fresh and `active`;
- the snapshot observed the credential issuance;
- the credential remains within its validity window.

A sanitized invalidation receipt is created for:

- `issuer_suspended`;
- `issuer_revoked`;
- `issuer_retired`;
- `status_snapshot_stale`.

The receipt stores only hashes and low-cardinality status. It does not contact the issuer or perform remote revocation.

## Audit retention handoff

Retention artifacts are allowlisted and represented only by SHA-256 hashes. The contract requires at least 2555 days, preserves immutability, supports legal hold and requires an eventual external archive. The repository cannot write to that archive or delete remote evidence.

Raw identity data, direct identifiers, private keys and historical-evidence deletion are prohibited.

## Conformance

The deterministic corpus contains 64 cases: 8 positive and 56 negative. It covers issuer records, lifecycle chains, terminal states, forks, replay, Ed25519, RSA-PSS, stale status, credential acceptance/invalidation and retention policy.

Result: `64/64` passed.

## Safety boundary

- network requests: 0
- database connections: 0
- staging reads or mutations: 0
- real issuers registered: 0
- real credentials invalidated: 0
- real archives configured: 0
- direct identifiers stored: 0
- private keys stored: 0
- migrations and rollbacks: 0
- payments, refunds and payouts: 0
- production changed: false
- pull request merged: false

## Preserved blockers

- `PAY-B01`
- `PAY-B03`
- `PAY-B04`

## Next

`PAY-A16` — issuer status distribution manifests, cache-consistency proofs, outage/degraded-mode policy and multi-issuer quorum health aggregation, remaining repository-only.
