# ANA-A09 Funnel Continuous Publication Scheduler Candidate

## Objective

Define the continuous publication scheduler contract for the eight canonical A09 funnel metrics after the bounded runtime canary succeeded.

The scheduler contract was first defined repository-only and is now accompanied by a **repository-only migration implementation candidate**. The migration has not been applied to staging, does not register a cron job merely by being applied, does not publish snapshots, and does not grant continuous publication authority.

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
- persistent scheduler creation in this lot: `0`
- staging writes in this lot: `0`
- production writes in this lot: `0`

The activation function binds the exact eight effective publication policies, the certified bounded-canary evidence, the approved policy evidence digest, exact job/schedule/command, conservative Cron headroom, and the existing A11 policy/scheduler. Exact replay is `NO_CHANGE`; conflicts fail closed.

## Operational proof observed

Read-only staging observation at `2026-10-01T11:21:06.217555Z`:

- active A09 publication policies: `8`
- A09 relevant cron jobs: `0`
- active cron jobs total: `6`
- running cron jobs at observation: `0`
- last 30 minutes: `78` cron runs, `0` failures
- maximum recent run duration: `0.544141s`
- last 10 minutes of A11: `10` runs, `0` failures
- A09 runtime functions: `4`, all owner `postgres`, SECURITY DEFINER, closed to client roles

Supabase recommends no more than eight concurrent Cron jobs and jobs shorter than ten minutes. This candidate records that as a **future activation gate**, not as permission to activate.

## Authority remains closed

- continuousPublicationAuthority = `false`
- runtimeSnapshotAuthority = `false`
- snapshotPublicationAuthority = `false`
- schedulerAuthority = `false`
- stagingAuthority = `false`
- productionAuthority = `false`
- mergeAuthority = `false`
- Ready for review authority = `false`

ANA remains **3/6**.

## Next gate

Regenerate the canonical Domain Completion Matrix and certify the exact resulting repository HEAD. Only after that may a **separate exact-head staging authorization** apply the migration and execute validation `056` rollback-only. Persistent A09 scheduler activation remains separately unauthorized.
