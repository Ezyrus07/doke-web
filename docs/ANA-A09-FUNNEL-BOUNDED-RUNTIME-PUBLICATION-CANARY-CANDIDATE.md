# ANA-A09 Funnel Bounded Runtime Publication Canary Candidate

## Objective

Prepare exactly one runtime publication canary for the first A09 funnel publication window.

This is a **repository-only candidate**. It does not execute the runtime publisher, write snapshots, create cron jobs, or grant continuous snapshot-publication authority.

## Bindings

- source HEAD: `1ed17963797f2abac68426a93fcc8ec4a51de779`
- Matrix: `v1.3.132`
- activation evidence blob: `e90054442245f5fe71d41d309cbb7e2809d10ec2`
- temporal config blob: `528b04abef9ea27a647fe648603bb2c4b07e7c93`
- policy set: `ana-a07-a09-funnel-v1-r1`
- persisted publication policies: `8`

## Exact canary window

- window start: `2026-10-01T00:00:00Z`
- window end: `2026-10-01T00:05:00Z`
- publication windows allowed: `1`
- snapshot write attempts allowed: `8`

Because the publication policy has a **60-second projection delay**, the direct-window executor must not run before:

`2026-10-01T00:06:00Z`

For a clean first-window canary, execution is recommended before `2026-10-01T00:11:00Z`, when the second five-minute window would also become eligible.

## Why the direct-window executor is required

The general catch-up executor can process up to three missing windows and up to twenty-four append attempts. That is broader than this canary authorization.

The future canary therefore must call exactly:

`private.run_analytics_a09_funnel_window_v1`

with the exact policy set and exact `00:00 → 00:05Z` window.

The catch-up executor is forbidden for this canary.

## Read-only staging proof

At repository-candidate creation time:

- publication policies persisted: `8`
- policies currently effective: `0`
- policies effective for the canary instant: `8`
- planner at `2026-10-01T00:06:00Z`: exactly `1` row
- planned window: `00:00 → 00:05Z`
- required metrics: `8`
- materialized target metrics: `0`
- missing target metrics: `8`
- target-window snapshots: `0`
- current A09 snapshots outside the target window: `8`
- A09 funnel cron: `0`
- A11 policy: `1`
- A11 scheduler: `1`
- planner/direct-window/catch-up functions: owner `postgres`, `SECURITY DEFINER`, no EXECUTE for `anon`, `authenticated`, or `service_role`

## Future staging execution envelope

A later explicit staging authorization must require, immediately before invocation:

1. exact certified repository HEAD;
2. database clock at or after `2026-10-01T00:06:00Z`;
3. exactly eight active publication policies for the policy set;
4. target-window snapshot count still `0`;
5. planner still returning exactly the single target window;
6. A09 funnel cron count still `0`;
7. A11 policy and scheduler still preserved.

The future invocation limit is **one**.

Expected result:

- processed metrics: `8`
- APPENDED: `8`
- NO_CHANGE: `0`
- target snapshots after commit: `8`
- revisions: all `1`
- higher revisions: `0`
- supersedes: all `null`
- scheduler creates: `0`

Any unexpected preexisting target snapshot or append result must fail closed and rollback.

## Authority after this lot

- runtimeCanaryExecutionAuthority = `false`
- snapshotMutationAuthority = `false`
- runtimeSnapshotAuthority = `false`
- snapshotPublicationAuthority = `false`
- schedulerAuthority = `false`
- stagingAuthority = `false`
- productionAuthority = `false`
- mergeAuthority = `false`
- Ready for review authority = `false`

ANA remains **3/6**.

## Next gate

First certify this candidate on the exact repository HEAD.

After `2026-10-01T00:06:00Z`, a separate explicit staging authorization may allow exactly one direct-window canary invocation. No continuous publication and no scheduler activation are implied by that later canary.


## Executed canary — reconciled staging evidence

The bounded runtime canary executed for the exact target window and its persistent result is recorded at:

`reports/generated/ana-a09-funnel-bounded-runtime-publication-canary-staging-evidence.json`

Evidence blob:

`e28703cd192e618582438bb0e63267caac881eda`

Observed persistent result:

- target snapshots: `0 → 8`
- distinct target metrics: `8`
- revision-one rows: `8`
- higher revisions: `0`
- supersedes null: `8`
- authoritative projections: `8`
- complete coverage: `8`
- exact data-through `2026-10-01T00:05:00Z`: `8`
- snapshot created_at: `2026-10-01T00:10:31.163345Z`
- snapshot computed_at: `2026-10-01T00:10:31.174346Z`
- A09 funnel cron: `0`
- scheduler creates: `0`
- A11 publication policy: `1`
- A11 scheduler: `1`

The direct executor return payload was not retained in accessible logs. Therefore this repository evidence does **not** claim a captured literal `appendedCount=8`. Instead, it records a strong persistent inference of eight appends from the exact `0 → 8` target-window transition, with all eight rows at revision 1, no higher revisions, and no superseded snapshots.

The canary does not grant continuous runtime snapshot authority, snapshot publication authority, or scheduler authority.

## Authority after canary

- runtimeProjectionAuthority = `true`
- runtimeCanaryExecutionAuthority = `false`
- snapshotMutationAuthority = `false`
- runtimeSnapshotAuthority = `false`
- snapshotPublicationAuthority = `false`
- schedulerAuthority = `false`
- stagingAuthority = `false`
- productionAuthority = `false`
- mergeAuthority = `false`
- Ready for review authority = `false`

ANA remains **3/6**.

## Next gate after evidence certification

After exact-head certification of this reconciliation, any move toward continuous funnel publication or an A09 scheduler must begin with a **separate repository-only candidate**. No scheduler creation or continuous publication is authorized by this canary evidence.
