# ANA-A09 Funnel Continuous Publication Scheduler Candidate

## Objective

Define the continuous publication scheduler contract for the eight canonical A09 funnel metrics after the bounded runtime canary succeeded.

The scheduler contract was first defined repository-only. Its owner-only activation boundary is now **installed and rollback-validated in staging**. The migration itself did not register a persistent cron job, validation `056` rolled back its synthetic scheduler rows, and persistent scheduler/continuous-publication authority remains closed.

## Certified inputs

- source HEAD: `01fb50d8f35276031efec3d252a4b91672aa8dcc`
- Matrix: `v1.3.132`
- policy set: `ana-a07-a09-funnel-v1-r1`
- canary evidence blob: `e28703cd192e618582438bb0e63267caac881eda`
- bounded canary config blob: `ea5ab76a922073322674e45509519ec680fb8672`
- bounded canary result: exactly eight target snapshots, all revision 1, no higher revisions
- A09 cron jobs: `0`
- A11 policy/scheduler: `1 / 1`

The literal direct-window executor return was not retained. The bounded canary is treated as passed from the stronger persistent evidence: an exact `0 → 8` revision-one materialization with no supersedes/higher revisions.

## Proposed scheduler

```text
jobName   = doke-ana-funnel-v1-r1
schedule  = * * * * *
poll      = 60 seconds
target    = private.run_analytics_a09_funnel_catch_up_v1
policySet = ana-a07-a09-funnel-v1-r1
```

Proposed command:

```sql
select private.run_analytics_a09_funnel_catch_up_v1(
  'ana-a07-a09-funnel-v1-r1',
  clock_timestamp()
);
```

The one-minute poll does **not** change the five-minute publication grid. The scheduler merely asks the planner once per minute; the planner remains authoritative for the 300-second window step and 60-second projection delay.

## Bounded continuous behavior

Each invocation remains constrained by the existing publication policy:

- window step: `300s`
- projection delay: `60s`
- maximum catch-up windows: `3`
- maximum snapshot append attempts: `24`
- ordering: `oldest_first`
- late-fact revisions remain under `ANA-A05`

The scheduler must call the **catch-up executor**, never the direct projection or direct window function.

## Materialized activation boundary

The authorized repository-only implementation materializes the owner-only function:

`private.activate_analytics_a09_funnel_scheduler_v1(text)`

Required semantics:

1. accept only `ana-a07-a09-funnel-v1-r1`;
2. prove the exact eight active policies and approved parameters;
3. prove the bounded canary evidence binding;
4. require zero conflicting A09 funnel jobs;
5. create exactly one postgres-local job named `doke-ana-funnel-v1-r1`;
6. return `APPENDED` on first activation;
7. return `NO_CHANGE` for an exact replay;
8. fail closed for any conflicting job;
9. verify the inserted cron row before returning;
10. preserve the A11 job unchanged;
11. remain inaccessible to `public`, `anon`, `authenticated`, and `service_role`.

The migration that defines this function **does not invoke it** and therefore does not itself create the cron job. Actual scheduler creation remains a separate staging invocation requiring another explicit authorization.

### Repository implementation evidence

- authorization source HEAD: `77c6ef87b8e773d2031631078169ad0bbc8c1a1c`
- Supabase CLI: `2.119.0`
- CLI generation workflow run/job: `36943876952 / 110641368483` — SUCCESS
- migration: `supabase/migrations/20261002000155_ana_a09_funnel_scheduler_activation.sql`
- migration blob: `9593480d6f3e6f4d63ec16c6fb5c2b2a590d5075`
- rollback-only validation: `supabase/tests/056_ana_a09_funnel_scheduler_activation_validation.sql`
- validation blob: `aeccec3474e1f4b52ff8c6faaa05e7d87dc846b5`
- repository migration version: `20261002000155`
- applied staging migration version: `20261002002201`
- validation `056`: `PASS` / rollback-only
- persistent scheduler creation after validation: `0`
- production writes: `0`

The activation function binds the exact eight effective publication policies, the certified bounded-canary evidence, the approved policy evidence digest, exact job/schedule/command, conservative Cron headroom, and the existing A11 policy/scheduler. Exact replay is `NO_CHANGE`; conflicts fail closed.

## Staging validation closure

Authorized staging application installed only the activation boundary and executed validation `056` rollback-only. Repository evidence: `reports/generated/ana-a09-funnel-scheduler-activation-staging-validation-evidence.json`.

Closure facts:

- authorized repository HEAD: `093b38cd1c868eba4e4e431a9032dd4e3c6122da`
- staging project: `zwkczgewzbsorbrjuzpb`
- applied migration: `20261002002201 / ana_a09_funnel_scheduler_activation`
- validation `056`: `PASS`
- activation function owner: `postgres`
- `SECURITY DEFINER`: `true`
- `anon/authenticated/service_role EXECUTE`: `false / false / false`
- first activation path tested transiently: `APPENDED`
- exact replay tested transiently: `NO_CHANGE`
- conflicting A09 cron tested transiently: fail closed
- A11 preservation: PASS
- persistent A09 cron after rollback: `0`
- A09 global snapshots after rollback: `16`

## Operational proof observed

Latest read-only staging reconciliation at `2026-10-02T00:27:38.076411Z`:

- active A09 publication policies: `8`
- approval-evidence digest: exactly one, `2db1282f585217ab76069ba564c94f9133d08b3fa4c7d2f87fea76049684c829`
- A09 relevant cron jobs: `0`
- active cron jobs total: `6`
- A09 global snapshots: `16`
- A11 publication policy rows: `1`
- A11 relevant/exact cron rows: `1 / 1`
- activation function: owner `postgres`, SECURITY DEFINER, closed to `anon`, `authenticated`, and `service_role`

Supabase recommends no more than eight concurrent Cron jobs and jobs shorter than ten minutes. This candidate records that as a **future activation gate**, not as permission to activate.

## Persistent staging scheduler activation

The A09 scheduler is now **persistently active in staging** under a separately authorized runtime activation. This document records that operational fact; the current repository-reconciliation lot has no scheduler/staging write authority.

Activation evidence:

- activation source HEAD: `a08f6b085cbfe2f2172afc7a95f3b4285a3dcc24`
- job: `14 / doke-ana-funnel-v1-r1`
- schedule: `* * * * *`
- first activation: `APPENDED`
- exact replay: `NO_CHANGE`
- target: `private.run_analytics_a09_funnel_catch_up_v1`
- exact A09 cron rows: `1`
- active cron jobs after activation: `7`
- A11 relevant/exact cron rows: `1 / 1`
- first two observed runs: `succeeded / succeeded`
- authorized activation checkpoint: `64` snapshots, all revision 1, no higher revisions

Read-only pre-write reconciliation at `2026-10-02T00:39:08.668128Z` observed four consecutive successful A09 scheduler runs and `112` global A09 snapshots, all `revision=1`, with `0` higher revisions and `0` recent Cron failures. The planner still returned three bounded missing windows with `[8,8,8]` missing metrics, so historical catch-up remains in progress.

The increase from `64 → 112` snapshots is expected continuous runtime progress, not repository drift. The scheduler publishes at most three missing five-minute windows per invocation, eight metrics per window. The activation/reconciliation evidence is stored at:

`reports/generated/ana-a09-funnel-continuous-scheduler-activation-staging-evidence.json`

The Control Center observation at this closure remained `DRIFT/SNAPSHOT` and reported staging runtime as `NOT CONNECTED`; it was therefore not used as runtime certification authority.

## Steady-state closure evidence

The staging scheduler has completed its historical bounded catch-up and reached **steady state**.

Authorized closure checkpoint:

- policy effective from: `2026-10-01T00:00:00Z`
- operational windows expected/materialized: `428 / 428`
- continuous without gaps: `true`
- pre-policy canary windows: `1`
- total snapshots: `3432`
- revision-one snapshots: `3432`
- higher revisions: `0`
- duplicate revision keys: `0`
- planner pending windows: `0`
- observed lag: `216s` against derived max `360s`

The mandatory pre-write read-only recheck at `2026-10-02T11:45:34.121791Z` reproduced the structural closure: `428/428` operational windows, no gaps, `3432/3432` revision-one snapshots, no duplicate revision keys, planner backlog `0`, A11 `1/1`, and `671/671` observed scheduler runs succeeded. The instantaneous lag was `334s`, still within the same `360s` bound.

Each of the eight metrics had exactly `429` snapshots: `428` post-policy operational windows plus the one eight-metric pre-policy canary window at `2026-09-29T01:55:00Z–02:00:00Z`. Therefore the apparent pre-policy calendar gap is not an operational publication gap.

Canonical closure evidence:

`reports/generated/ana-a09-funnel-steady-state-closure-staging-evidence.json`

This is **staging-operational evidence only**. It does not promote ANA maturity, authorize production, merge the PR, change scheduler cadence, or grant Ready for review.

## Current reconciliation authority

The staging scheduler and continuous publication are already active from the prior explicit runtime authorization. For **this repository-only reconciliation**, no additional runtime mutation is authorized:

- schedulerActivationAuthority = `false`
- stagingAuthority = `false`
- productionAuthority = `false`
- mergeAuthority = `false`
- Ready for review authority = `false`
- historyRewriteAuthority = `false`

ANA remains **3/6**.

## Next gate

Certify the steady-state closure evidence on the exact resulting repository HEAD. After certification, A09 has staging-operational closure evidence, but maturity remains `3/6` until a separate maturity gate explicitly evaluates and authorizes promotion. Production, scheduler mutation, merge and Ready for review remain separately governed.
