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


## Syntax remediation after failed staging apply

The first staging application attempt of migration `20260927230000` was rejected by PostgreSQL with SQLSTATE `42601` before any migration ledger entry or adapter RPC was created. The failure was isolated to `pg_catalog.extract(epoch from ...)`.

The repository-only remediation changes exactly that syntax to PostgreSQL's special-form `extract(epoch from ...)`. Failed migration blob: `df4a36d99e1bcce1755c3ff7d52666947464a788`. Remediated migration blob: `d1f87a8ea609cd3aee881ea8abac092cdc5983ed`.

Validation 051 is byte-identical and remains pending. The previous staging authorization is consumed; applying the remediated blob requires a new exact-head staging authorization. No append/snapshot/publication/scheduler authority is granted by this remediation.


## Runtime type remediation after validation 051 failure

The remediated original migration was subsequently applied in staging as version `20260928005802`, but validation `051` failed with SQLSTATE `42883` when the adapter executed `pg_catalog.greatest(...)`.

Root cause: PostgreSQL `GREATEST` is special syntax rather than a schema-qualified catalog function. Because the original migration is already applied, repository history is not rewritten. The repository-only remediation is a forward `CREATE OR REPLACE FUNCTION` migration:

- `supabase/migrations/20260928012000_ana_a09_canonical_funnel_snapshot_payload_adapter_runtime_type_remediation.sql`
- blob `ae59dd5d5e9656a938ec6d725e6305b549e0a698`
- replacement: `pg_catalog.greatest(0, floor(...)::bigint)` → `greatest(0::bigint, floor(...)::bigint)`

The unchanged validation `051` remains failed/pending rerun. This lot does not apply the forward migration to staging and grants no append, snapshot mutation/publication, scheduler, production, merge or Ready authority.
