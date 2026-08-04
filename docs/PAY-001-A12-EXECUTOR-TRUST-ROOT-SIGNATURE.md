# PAY-001 A12 — Executor Trust Roots and Offline Detached Signatures

## Objective

PAY-A12 closes the cryptographic gap left after PAY-A10 and PAY-A11. PAY-A10 validated receipt structure and signature digests, while PAY-A11 froze provider-neutral executor protocol manifests. Neither step proved that a receipt was signed by an approved executor key.

PAY-A12 defines a repository-only trust-root and detached-signature contract. It does not configure a real executor, trust root, endpoint, credential, secret, migration, staging connection or production authority.

## Canonical contracts

- `pay-a12-executor-trust-root-signature-v1`
- `pay-reconciliation-executor-trust-bundle-v1`
- `pay-reconciliation-detached-signature-v1`
- `pay-reconciliation-verified-receipt-v1`
- signing domain `doke-pay-executor-receipt-v1`

## Offline verification order

1. validate the trust bundle and its fingerprint;
2. reject private JWK material and production roots;
3. identify the exact key id and key version;
4. enforce the operation and executor allowlists;
5. enforce active, retiring or revoked lifecycle policy;
6. rebuild the canonical PAY-A10 receipt signing payload;
7. compare the signed payload hash and signature hash;
8. verify Ed25519 or RSA-PSS-SHA256 offline;
9. reject envelope replay;
10. only then call the existing PAY-A10 receipt validator.

A valid signature does not authorize the next PAY-A09 phase and does not trigger any remote action.

## Key rotation

A successor key must:

- use the same key family and algorithm;
- have a strictly greater key version;
- reference an existing predecessor;
- supersede only a retiring or revoked predecessor.

A retiring key may only validate receipts signed on or before `retireAt`, and only until the bounded `acceptUntil` grace expires. New signatures after retirement are rejected.

## Revocation

A revoked key is rejected immediately by this contract. The repository does not contain a real revocation feed, key-management system or production trust bundle. Incident procedures and approval quorum remain PAY-A13 work.

## Key custody

Private keys are never accepted in trust bundles. The repository stores no real private key and no real public trust root. Runtime tests generate synthetic ephemeral Ed25519 and RSA keys in memory and discard them after the process exits.

## Conformance corpus

The deterministic inventory contains 28 cases:

- 4 positive cases;
- 24 fail-closed negative cases.

The suite covers active Ed25519 and RSA-PSS roots, rotation success, retiring-key grace, missing or drifted bundles, private-key rejection, unknown/revoked/expired keys, operation and executor denial, payload/signature drift, invalid signatures, replay, broken rotation chains and production denial.

## Operational safety

- network requests: `0`
- database connections: `0`
- subprocesses: `0`
- environment reads: `0`
- real trust roots configured: `0`
- private keys stored: `0`
- staging reads or mutations: `0`
- migrations or rollbacks applied: `0`
- payments, refunds or payouts: `0`
- production changes: `0`

## Remaining blockers

- `PAY-B01` — no contracted PSP, executor, credentials or real webhook authority;
- `PAY-B03` — commercial, fiscal, escrow, refund, dispute and payout rules remain unapproved;
- `PAY-B04` — no remote reconciliation store, migrations, scheduler, metrics, alerts, on-call or staging rehearsal.

## Next action

PAY-A13 completed the lifecycle-governance handoff. `PAY-A14` — define signed governance evidence bundles, external identity attestation ingestion and immutable lifecycle decision receipt chaining, remaining repository-only.
