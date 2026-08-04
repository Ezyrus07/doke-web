# PAY-001 / PAY-A16 — Issuer Status Distribution Resilience

## Purpose

PAY-A15 made issuer lifecycle and signed short-lived status snapshots verifiable offline. PAY-A16 closes the next repository-only boundary: how the same verified status is distributed, cached, compared across replicas and aggregated across independent issuers without inventing a real endpoint, cache provider or remote refresh authority.

The canonical contract is `pay-a16-issuer-status-distribution-resilience-v1`.

## Distribution manifests

Each `pay-identity-status-distribution-manifest-v1` binds one PAY-A15 verified status to the issuer hash, issuer-family hash, issuer-record fingerprint, trust-bundle fingerprint, lifecycle event, lifecycle sequence, snapshot fingerprint, payload hash and a contiguous distribution epoch.

The repository permits only the provider-neutral channel labels `offline_bundle`, `primary` and `secondary`. They are logical lanes, not URLs or provider configuration. Endpoint, credential, private-key, production and remote-execution material is rejected recursively.

A manifest remains inside the PAY-A15 signed status window, is valid for at most 900 seconds, uses a cache TTL of at most 60 seconds and a stale-while-revalidate allowance of at most 120 seconds. Epoch rollback, lifecycle rollback, predecessor drift and clock rollback fail closed.

## Cache consistency proofs

`pay-identity-status-cache-entry-v1` records only hashes, fingerprints, sequence, epoch and bounded timestamps. Raw snapshots are not retained. Every entry is immutable and bound exactly to one manifest.

`pay-identity-status-cache-consistency-proof-v1` requires at least two independent replica hashes. It rejects duplicate replicas, duplicate entries, payload drift, snapshot drift, epoch drift, lifecycle drift, future cache entries, stale entries beyond the allowance and split-brain evidence. Proofs are deterministic and contain no network or database authority.

## Outage and degraded mode

The outage policy has three states:

```text
healthy
degraded_read_only
fail_closed
```

Fresh replica quorum produces `healthy`. A consistent but stale cache may produce `degraded_read_only` for no more than 120 seconds. Degraded mode permits only inspection of already verified cached evidence; it never permits new credential acceptance.

Missing distribution, expired manifests, excessive outage duration, revoked/suspended/retired issuers or inconsistent evidence produce `fail_closed`. Fail-open behavior and automatic remote refresh are explicitly prohibited.

## Multi-issuer quorum

`pay-identity-multi-issuer-health-snapshot-v1` summarizes one issuer without storing direct identity attributes. `pay-identity-multi-issuer-quorum-decision-v1` requires at least two distinct issuer hashes and two distinct issuer-family hashes bound to the same request context.

A healthy quorum requires two healthy independent issuers. A bounded mix of healthy and degraded issuers can produce `degraded_quorum`, but cannot authorize new credential acceptance. Any fail-closed issuer or unsafe issuer status overrides the aggregate and produces `fail_closed`.

The quorum is a health gate only. It does not verify a user, approve a governance action or execute an external request.

## Immutable receipts

Distribution decisions can be chained through `pay-identity-status-distribution-receipt-v1`. Sequence must be contiguous, predecessor hashes must match and a chain cannot cross issuers. Replay, fork and integrity drift are rejected.

## Deterministic conformance

```text
72 cases
10 positive
62 negative
72/72 passed
```

Negative coverage includes remote endpoints, credentials, provider-like values, invalid hashes, production, manifest drift, epoch gaps, lifecycle rollback, cache split-brain, duplicate replicas, stale cache, clock rollback, fail-open, automatic refresh, degraded credential acceptance, duplicate issuers/families, quorum context drift and receipt replay/fork/integrity failures.

## Operational boundary

PAY-A16 performs zero network requests, database connections, subprocesses, environment reads, staging reads, staging mutations, migrations, deployments, cache writes, identity-provider calls or financial operations. PAY-B01, PAY-B03 and PAY-B04 remain open. PAY maturity remains 2/6.

## Next sublot

PAY-A18 should define transparency checkpoints, rollback-safe distribution recovery, cache-poisoning incident evidence and operational adoption handoff, remaining repository-only.
