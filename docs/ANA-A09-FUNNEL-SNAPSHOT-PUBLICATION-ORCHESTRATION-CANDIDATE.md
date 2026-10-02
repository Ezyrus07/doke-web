# ANA-A09 Funnel Snapshot Publication Orchestration Candidate

## Objective

Prepare the next ANA-A09 publication gate without creating a second analytics publication authority.

The candidate reuses `private.analytics_metric_publication_policies_v1`, preserves the active ANA-A11 liquidity path, and adds a bounded global-funnel planner/orchestrator/catch-up contract. The structural migration has now been applied and validated in staging; runtime snapshot, publication and scheduler authority remain disabled.

## Root cause

ANA-A09 now has:

- certified server-side funnel projection;
- eight active A07/A09 freshness policies;
- certified first snapshot append;
- certified exact replay idempotency.

The remaining operational gap is continuous publication. The existing publication-policy table is the correct authority, but its original constraints are intentionally hard-bound to ANA-A11 liquidity.

Creating a second table would produce competing publication authorities. This candidate instead generalizes the existing constraint forward-only while preserving the A11 contract exactly.

## Source bindings

- A09 projection config: `2ea7cdd6d3864da26ba29813ef78c8cc85392f56`
- A07/A09 freshness config: `8b9ef1b01de43852101a9021da2423c4269079ba`
- replay evidence: `3dd8511d84e25d08115a3b8f04cb186452f7fb5e`
- append invocation config: `5bda6bfbd4199fc29e9342abced71e0d2e2b053c`
- A11 publication-policy base: `a42e584513078e0c4127dd367ca56ad36615a07d`
- A11 planner reference: `dd39a22a9e04b32f2e550bc5d7c5637f8f9ea6b8`
- A11 executor reference: `25d57899a058711210fde5b4945d3db2de751dcf`
- A11 scheduler reference: `3e18ce8809ba3abed374354720783c7f77bec4d0`

## Candidate files

Migration:

`supabase/migrations/20260929121600_ana_a09_funnel_snapshot_publication_orchestration_candidate.sql`

Migration blob:

`01a6d7208a9d4d288eb9995325707d0ccdc9a3a6`

Rollback-only structural validation:

`supabase/tests/054_ana_a09_funnel_snapshot_publication_orchestration_candidate_validation.sql`

Validation blob:

`906629533492eec6be83441e51554d6eee4a3a97`

## Publication authority model

The migration does not create another publication-policy table.

It replaces the two A11-only contract constraints with one scope constraint admitting exactly:

1. the existing A11 liquidity contract pair for `liquidity.active_service_seconds`; or
2. the A09 funnel contract pair for the eight canonical global funnel metrics.

The existing generic selector `private.current_analytics_metric_publication_policy_v1` is untouched.

No existing A11 publication row is updated or deleted by this candidate.

## A09 policy-set requirements

A future A09 publication policy set must contain exactly eight active rows associated through approval evidence with:

`policySetId = ana-a07-a09-funnel-v1-r1`

All eight rows must share:

- metric version `v1`;
- window step `300s`;
- projection-delay SLO `60s`;
- derived max lag `360s`;
- max catch-up windows `3`;
- oldest-first ordering;
- scheduler mechanism `supabase_pg_cron_database_local`;
- one explicit window anchor;
- one explicit effective window.

The anchor and effective window are **not selected in this candidate**.

## Planner

`private.plan_analytics_a09_funnel_windows_v1` plans only global funnel windows with fewer than eight persisted metric identities.

It is bounded to three oldest missing windows per invocation.

Already materialized windows are not automatically revisited by this planner. Late-fact correction remains explicitly owned by ANA-A05 rather than silently expanding A09 scheduler authority.

## Window orchestrator

`private.run_analytics_a09_funnel_window_v1`:

1. validates the active eight-row publication policy set;
2. validates the 300-second grid and 60-second publication delay;
3. obtains the eight append-compatible payloads from the certified A09 snapshot payload adapter;
4. rejects invalid or duplicate metric identities;
5. delegates each payload to `public.append_analytics_metric_snapshot_v1`;
6. accepts only `APPENDED` or `NO_CHANGE`;
7. processes exactly eight metric payloads atomically.

The function is private, owner-only and denied to `public`, `anon`, `authenticated` and `service_role`.

## Catch-up executor

`private.run_analytics_a09_funnel_catch_up_v1` consumes only planner output.

Maximum bounded work per invocation:

- 3 windows;
- 8 metrics per window;
- 24 append attempts.

Any uncaught error aborts the caller transaction.

## Scheduler boundary

This candidate creates **no scheduler activation function and no cron job**.

The A11 scheduler migration is used only as an architectural reference. A future A09 scheduler gate must be separately authorized after policy approval/activation and a bounded staging runtime canary.

## Validation 054

Validation 054 is rollback-only and structural. It proves:

- the generalized publication constraint contains both A11 and A09 scopes;
- the old A11-only constraints are gone;
- the existing A11 liquidity policy still resolves with 300/60/360/3 semantics;
- zero A09 funnel publication-policy rows exist;
- zero funnel cron jobs exist;
- all four new A09 private functions exist;
- none is executable by anon/authenticated/service_role;
- the missing A09 publication policy set fails closed;
- no mutation-capable A09 publication function is invoked by the validation.

## Staging structural evidence

Machine-readable evidence:

`reports/generated/ana-a09-funnel-snapshot-publication-orchestration-staging-evidence.json`

Evidence blob:

`0fa5595dd8b0c0ba925ff46fb7c3dbe0bc150595`

Staging result:

- repository migration version: `20260929121600`
- applied staging migration version: `20260929125652`
- validation `054`: **PASS**, rollback-only
- A11 publication policy count: `1`
- A11 scheduler count: `1`
- A09 funnel publication policy count: `0`
- A09 funnel cron count: `0`
- A09 global snapshot count: `8 → 8`
- snapshot writes in this lot: `0`
- candidate private functions installed: `4`
- all four functions remain owner `postgres` and non-executable by `anon`, `authenticated`, and `service_role`
- no candidate-specific security or performance advisor finding was introduced

The structural staging gate is therefore proven without activating publication.

## Authority after this lot

- runtimeProjectionAuthority = `true`
- runtimeSnapshotAuthority = `false`
- snapshotPublicationAuthority = `false`
- schedulerAuthority = `false`
- stagingAuthority = `false`
- productionAuthority = `false`
- mergeAuthority = `false`
- Ready for review authority = `false`

ANA remains **3/6**.

## Next gate

After exact-head repository certification of this staging evidence, prepare a separate **repository-only publication-policy approval/activation candidate**.

That candidate may define the exact eight-row A09 policy set and authorization contract, but it must not persist those policies in staging, publish snapshots or create a scheduler until separately authorized. Bounded runtime canary and scheduler activation remain later gates.
