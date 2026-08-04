# PAY-A17 — Transparency Checkpoints, Forward-Only Recovery, Cache-Poisoning Evidence and Operational Adoption Handoff

## Objective

PAY-A16 defines provider-neutral distribution manifests, immutable cache entries, replica-consistency proofs, fail-closed outage behavior and independent multi-issuer health quorum.

PAY-A17 closes the next repository-only boundary:

- append-only transparency checkpoints for the distribution state;
- forward-only, rollback-safe recovery plans and results;
- hashes-only cache-poisoning incident evidence;
- immutable incident-evidence chains;
- a blocked operational adoption handoff with explicit owners, reviewers and preserved PAY blockers.

No real transparency log, witness, cache, endpoint, identity provider, recovery executor or production authority is configured.

## Canonical contracts

```text
pay-a17-transparency-recovery-incident-handoff-v1
pay-identity-distribution-transparency-checkpoint-v1
pay-identity-distribution-transparency-chain-v1
pay-identity-distribution-recovery-plan-v1
pay-identity-distribution-recovery-result-v1
pay-identity-cache-poisoning-incident-evidence-v1
pay-identity-cache-poisoning-incident-chain-v1
pay-identity-distribution-operational-adoption-handoff-v1
pay-identity-distribution-operational-adoption-decision-v1
```

## Transparency checkpoints

A checkpoint binds:

- the exact PAY-A16 distribution manifest fingerprint;
- distribution epoch and lifecycle sequence;
- issuer and issuer-family hashes;
- cache-consistency proof fingerprint;
- multi-issuer quorum decision fingerprint;
- append-only sequence and predecessor hash;
- strictly increasing tree size;
- canonical witness hashes;
- an offline Merkle-style root hash;
- an observation timestamp bounded to a 300-second checkpoint interval.

The repository rejects:

- integrity drift;
- sequence gaps;
- checkpoint fork or replay;
- issuer-family crossover;
- distribution-epoch rollback;
- lifecycle rollback;
- tree-size rollback;
- clock rollback;
- duplicate or unordered witnesses;
- endpoint, credential or private-key material;
- production publication.

The only publication mode is `offline_bundle`.

## Forward-only recovery

A recovery plan must bind the compromised checkpoint, the last-known-good predecessor, a newer PAY-A16 manifest, the cache entries to invalidate, independent witnesses, operator-role hashes and a minimum two-approval quorum.

The recovery mode is exclusively:

```text
forward_only_rebuild
```

The plan cannot:

- restore the compromised distribution epoch;
- reduce the lifecycle sequence;
- reuse the compromised manifest;
- execute automatically;
- call a remote system;
- invalidate a cache set different from the approved plan.

A valid recovery result must remain inside a 900-second local validation window and match the plan, rebuilt checkpoint, target manifest, target epoch, target lifecycle and exact invalidation set.

## Cache-poisoning incident evidence

The evidence contract covers:

```text
manifest_mismatch
payload_hash_mismatch
split_brain
replay
clock_rollback
```

Evidence is hashes-only. It may contain fingerprints of compromised cache entries, observed replicas, expected and observed manifests, poisoned payload hashes and the compromised checkpoint hash.

The following are forbidden:

- direct personal identifiers;
- raw cache payloads;
- endpoint or provider details;
- credentials or tokens;
- private-key material;
- remote containment authority.

Containment states are monotonic:

```text
under_investigation
contained_offline
recovery_validated
```

`recovery_validated` requires an offline-validated PAY-A17 recovery result. Incident chains reject forks, replay, sequence gaps, issuer crossover, clock rollback and containment-state rollback.

## Operational adoption handoff

The handoff binds:

- checkpoint-chain head;
- recovery-result fingerprint;
- incident-chain head;
- runbook fingerprint;
- rehearsal-evidence fingerprint;
- monitoring-contract fingerprint;
- rollback-procedure fingerprint;
- separated owner and reviewer role hashes;
- a minimum two-reviewer approval quorum;
- the preserved blockers `PAY-B01`, `PAY-B03` and `PAY-B04`.

The only adoption state is:

```text
blocked_repository_only
```

The repository cannot mark the payment domain ready, activate remote publication, execute recovery, contact a provider, alter production or approve operational adoption.

## Deterministic conformance

```text
94 total cases
12 positive cases
82 negative cases
94/94 passed
```

Coverage includes:

- valid genesis and successor checkpoints;
- append-only checkpoint-chain validation;
- checkpoint integrity, fork and replay;
- epoch, lifecycle, tree-size and clock rollback;
- witness cardinality, uniqueness and canonical ordering;
- valid forward-only recovery plan and result;
- compromised checkpoint and manifest reuse;
- approval quorum and invalidation-set mismatch;
- automatic recovery execution;
- manifest-mismatch incident evidence;
- hashes-only and sensitive-material rejection;
- incident predecessor, sequence, replay and containment rollback;
- recovery-validated incident state;
- adoption handoff binding and role separation;
- blocker drift and attempted operational activation;
- zero network, database, subprocess and environment effects.

## Permanent assets

- `backend/modules/payments/payment-reconciliation-transparency-recovery.js`
- `config/pay-001-a17-transparency-recovery-incident-handoff.json`
- `tests/fixtures/pay-a17-transparency-recovery-incident-handoff-cases.json`
- `docs/PAY-001-A17-TRANSPARENCY-RECOVERY-INCIDENT-HANDOFF.md`
- `docs/validation/PAY-001-A17-TRANSPARENCY-RECOVERY-INCIDENT-HANDOFF.json`
- `scripts/audit-pay-001-a17-transparency-recovery-incident-handoff.js`
- `scripts/test-pay-001-a17-transparency-recovery-incident-handoff.js`
- `.github/workflows/pay-001-a17-transparency-recovery-incident-handoff.yml`

## Preserved blockers

- `PAY-B01` — no contracted PSP, account, provider-specific adapter, credentials, real webhook or live conformance.
- `PAY-B03` — commercial, fiscal, escrow, refund, dispute, chargeback and payout rules remain materially unapproved.
- `PAY-B04` — remote store, applied migrations, leases, scheduler, metrics sink, alert delivery, on-call and staging rehearsal remain absent.

## Operational effects

```text
network requests: 0
database connections: 0
subprocesses: 0
environment reads: 0
staging reads or mutations: 0
real checkpoints published: 0
real witnesses contacted: 0
real recovery plans executed: 0
real cache entries invalidated: 0
real incident containment actions: 0
real adoption decisions applied: 0
payments, refunds or payouts: 0
production changes: 0
merge or auto-merge: 0
```

## Next action

`PAY-A18` — define witness interoperability, checkpoint inclusion and consistency-proof conformance, recovery rehearsal attestation and the final pre-provider adoption gate, remaining repository-only.
