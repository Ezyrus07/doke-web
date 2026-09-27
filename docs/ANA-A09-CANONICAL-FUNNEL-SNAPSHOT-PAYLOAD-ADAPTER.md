# ANA-A09 — Canonical funnel snapshot payload adapter candidate

## Objective

Prepare a compute-only adapter between the certified A09 global funnel projector and the existing A04/A05 append-only metric snapshot contract.

This repository-only candidate **does not publish a snapshot** and grants no runtime snapshot, publication or scheduler authority.

## Input authorities

- A09 canonical global funnel compute: `public.compute_analytics_canonical_funnel_v1`.
- A07/A09 active per-metric freshness policies: 8 revision-1 policies, `maxLagSeconds=360`.
- A04 append contract: `public.append_analytics_metric_snapshot_v1(jsonb)`.
- A05 revision/fingerprint semantics.

## Payload contract

For each of the eight global funnel metrics the adapter produces:

- metric/version;
- window start/end;
- metric-specific dataThrough;
- global dimensions `{}`;
- numerator, denominator, value and sample count;
- projection state from the active freshness policy;
- coverage state `complete` only for an actually computed upstream projection;
- reconciliation state `not_applicable` — it never invents `matched`;
- deterministic source and projection fingerprints;
- computedAt.

The first seven behavior-only metrics reuse the canonical A09 behavior source fingerprint. The final behavior→ORD metric uses a deterministic SHA-256 composition of the cross-behavior and ORD fingerprints.

The projection fingerprint hashes the same semantic surface used by A05 for value/sample/dimensions/coverage identity.

## Hard boundaries

The candidate:
- does not call the append RPC;
- performs no INSERT/UPDATE/DELETE;
- creates no cron job;
- is global-funnel-only;
- is service-role-only;
- keeps `runtimeSnapshotAuthority=false`;
- keeps `snapshotPublicationAuthority=false`;
- keeps `schedulerAuthority=false`;
- does not alter A09 identity/linkage semantics;
- does not promote ANA above 3/6.

## Candidate files

- `supabase/migrations/20260927230000_ana_a09_canonical_funnel_snapshot_payload_adapter.sql`
- `supabase/tests/051_ana_a09_canonical_funnel_snapshot_payload_adapter_validation.sql`
- `config/ana-a09-canonical-funnel-snapshot-payload-adapter.json`

Migration application and validation 051 require a separate exact-head staging authorization.
