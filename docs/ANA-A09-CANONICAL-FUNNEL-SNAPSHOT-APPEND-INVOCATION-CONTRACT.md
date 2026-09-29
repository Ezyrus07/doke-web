# ANA-A09 — Canonical funnel snapshot append invocation contract candidate

## Objective

Define the server-side, fail-closed bridge between the staging-certified A09 canonical funnel payload adapter and the existing A04 append-only snapshot primitive.

This lot is **repository-only**. It does not apply a migration, invoke an append, write a snapshot, activate a scheduler, publish a runtime surface, touch production, merge the PR or move it to Ready.

## Source authorities

- Payload adapter: `ana-a09-canonical-funnel-snapshot-payload-adapter-candidate-v1`.
- Staging payload evidence: validation `051 = PASS`, blob `ddd29090dde2a3b131d8cc1871b3eb82843c130d`.
- A04 append primitive: `public.append_analytics_metric_snapshot_v1(jsonb)`, source blob `64da0e7aec1ea15c9a58656ab1b0a63c8b7065a5`.
- A05 reconciliation/revision semantics: blob `3bc753fe72a9a031ca43664ac28c8a659920c7ac`.
- Matrix binding: `v1.3.132`, config blob `b741af2cf7770d7fdb6969081ce19f8ceb8b3acd`.

## Candidate functions

### Authorization validator

`private.validate_a09_snapshot_append_invocation_authorization_v1`

A future invocation must provide explicit project-owner authorization evidence bound to:

- the exact repository HEAD;
- the exact Domain Completion Matrix version;
- one exact `windowStart/windowEnd`;
- the payload-adapter staging evidence blob;
- the A04 and A05 source blobs;
- exactly eight maximum snapshot writes.

The future authorization evidence must explicitly authorize one bounded append window and snapshot mutation while keeping continuous runtime snapshot authority, snapshot-publication authority, scheduler, production, merge and Ready authority false.

### Append invoker

`private.invoke_a09_canonical_funnel_snapshot_append_v1`

When—and only when—a later explicit staging mutation authorization exists, the function is designed to:

1. validate the exact authorization evidence;
2. compute the eight canonical A09 global-funnel payloads;
3. require the adapter state `payloads_computed_candidate`;
4. require exactly eight payloads;
5. pass each payload to A04 `append_analytics_metric_snapshot_v1`;
6. accept only `APPENDED` or `NO_CHANGE`;
7. process at most eight writes in one PostgreSQL transaction.

A replay for the same authorized window is bounded by A04 fingerprint idempotency. A divergent concurrent revision still fails closed through A04's SQLSTATE `40001` behavior.

## Privilege boundary

Both private candidate functions are owned by `postgres`, use `SECURITY DEFINER`, and revoke EXECUTE from:

- `public`;
- `anon`;
- `authenticated`;
- `service_role`.

Therefore installing the candidate in a later structure-only staging lot still does not create an application-callable append path.

## Validation 052

`supabase/tests/052_ana_a09_canonical_funnel_snapshot_append_invocation_contract_validation.sql` is structural and rollback-only.

It verifies:

- both functions exist;
- owner/security-definer boundaries;
- no client/service-role EXECUTE;
- exact source-evidence bindings;
- the invoker references the payload adapter and A04 append primitive;
- the eight-write cap;
- absence of scheduler and continuous snapshot/publication authority;
- snapshot row count remains unchanged.

Validation 052 intentionally **does not call the invoker**.

## Maturity

ANA remains **3/6**. This candidate creates a safe path to a future bounded append canary; it does not itself grant append invocation, snapshot mutation, runtime snapshot, publication or scheduler authority.

## Next gate

After exact-head repository certification—and Domain Matrix regeneration if the new migration candidate makes generated governance artifacts stale—a separate staging-structure authorization may apply only the candidate migration and run validation 052.

That future structure-only authorization must still keep:

- `appendInvocationAuthority=false`;
- `snapshotMutationAuthority=false`;
- `runtimeSnapshotAuthority=false`;
- `snapshotPublicationAuthority=false`;
- `schedulerAuthority=false`.

## Staging structure installation — validation 052 PASS

The private append-invocation contract structure is now installed in `doke-web-staging` (`zwkczgewzbsorbrjuzpb`).

- repository migration: `20260928134000`
- migration blob: `5661652eb4a428976419c46db5d66bcb0e2505b1`
- staging ledger version: `20260928141605`
- validation `052`: **PASS**
- validation blob: `60a6326327bf673a2f3d81a60f1f44b8609ffa17`

Validation 052 remained structural and rollback-only. It did not invoke `private.invoke_a09_canonical_funnel_snapshot_append_v1` and detected no snapshot mutation.

Runtime privilege verification confirms that `anon`, `authenticated` and `service_role` have no `EXECUTE` privilege on either the authorization validator or append invoker. Installing the structure therefore did not create an application-callable append path.

Canonical staging evidence:

- `reports/generated/ana-a09-canonical-funnel-snapshot-append-invocation-contract-staging-structure-evidence.json`

The current authorities remain:

- `appendInvocationAuthority=false`
- `snapshotMutationAuthority=false`
- `runtimeSnapshotAuthority=false`
- `snapshotPublicationAuthority=false`
- `schedulerAuthority=false`

ANA remains **3/6**.

The next functional gate is a repository-only bounded first-append canary authorization contract for one explicit time window. No append or snapshot mutation is authorized by this evidence reconciliation.

## Runtime validator blocker discovered before first append

The authorized first-append canary for `2026-09-28T15:55:00Z → 2026-09-28T16:00:00Z` was **not invoked**.

A final read-only dependency preflight proved that the installed validator references:

`pg_catalog.jsonb_object_length(jsonb)`

That function is unavailable in the staging PostgreSQL 17.6 runtime. The exact canary window still had **0** target snapshots after the blocker was confirmed.

This does not invalidate validation 052 as a structural check; it exposes its limitation: 052 intentionally did not execute the validator.

### Forward-only remediation candidate

The historical applied migration `20260928134000` remains untouched.

The forward migration candidate:

- `supabase/migrations/20260929005500_ana_a09_snapshot_append_validator_jsonb_cardinality_runtime_remediation.sql`

replaces JSONB object cardinality checks with explicit counts over `pg_catalog.jsonb_object_keys(...)`.

It does not alter the invoker, grant EXECUTE, call A04 append, write snapshots, create a scheduler, or grant publication authority.

### Validation 053

`supabase/tests/053_ana_a09_snapshot_append_validator_runtime_validation.sql` is rollback-only and non-mutating. Unlike 052, it **executes the validator** with a complete synthetically bound evidence object and verifies the successful authorization result.

Validation 053 explicitly does **not** call:

- `private.invoke_a09_canonical_funnel_snapshot_append_v1`;
- `public.append_analytics_metric_snapshot_v1`.

It also compares snapshot row counts before/after the validator call.

Until the forward migration is separately applied and 053 passes in staging, the first append canary remains blocked and the previous canary execution authorization must not be reused.

ANA remains **3/6** and all append/publication/scheduler authorities remain false.

## Runtime validator remediation — staging validation 053 PASS

The forward-only JSONB cardinality remediation is applied in `doke-web-staging`.

- repository migration: `20260929005500`
- migration blob: `3db9120aaebf24a9ef9a6a73579f7d14203cb1f8`
- staging ledger version: `20260929013223`
- validation `053`: **PASS**
- validation blob: `7ae6a7f6a69c908a50997d44fd11c883eb00e180`

Validation 053 executed the authorization validator, remained rollback-only, did not invoke the append successor and did not mutate snapshots.

Runtime inspection confirms that the validator no longer calls `pg_catalog.jsonb_object_length(...)`, uses `pg_catalog.jsonb_object_keys(...)`, and both the validator and invoker remain non-executable by `anon`, `authenticated` and `service_role`.

The previously blocked canary window `2026-09-28T15:55:00Z → 2026-09-28T16:00:00Z` still contains **0** target snapshots. Its previous authorization must not be reused.

Canonical evidence:

- `reports/generated/ana-a09-snapshot-append-validator-jsonb-cardinality-remediation-staging-evidence.json`

This resolves the validator runtime blocker but does not authorize an append. A fresh read-only preflight and a new exact-window authorization are required.

ANA remains **3/6** and append/snapshot/publication/scheduler authorities remain false.

