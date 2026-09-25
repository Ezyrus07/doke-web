# ANA-A07/A09 — Activation approval and successor

The activation approval is materialized and the approval-aware successor is now staging-validated.

## Approval binding

- authorization SHA-256: `d72f3930dffb8ba36d49c22eaebec4f20cf88121280c4201a6eb8a140a7dc494`
- activation-approval evidence SHA-256: `ca2bc22dcf252f0b1924c24ba522252cab37312ff5f436435723c0b1ceacb603`
- approval-envelope evidence SHA-256: `9b4db03b33bdb7084899225fa2d08b78fdf4f87687b55e077b3a956a0aa981a5`
- runtime-enforcement evidence blob: `118ca5f948f93ca09c7a7305d1b230880fa98630`
- effectiveFrom: `2026-09-24T14:00:00Z`
- effectiveUntil: `null`
- approved future insert cardinality: `8`
- activation invocation limit: `1`

## Staging validation

The successor migration is applied in staging as version `20260925112930`, and validation `045` passes in rollback-only mode.

The validation proves:

1. activation-approval evidence acceptance;
2. repository-head mismatch rejection;
3. transient insertion of exactly eight freshness rows;
4. replay/overlap rejection;
5. legacy tombstone rejection;
6. full transaction rollback.

Post-validation state remains:

- persistent freshness-policy rows: **0**
- activation invoked persistently: **false**
- snapshots written: **0**
- cron created: **false**

The validator and successor are postgres-owned `SECURITY DEFINER` functions with EXECUTE revoked from `anon`, `authenticated` and `service_role`. No new Security Advisor finding is attributable to these functions.

## Next gate

Persistent activation requires a new explicit single-use staging authorization bound to the current PR HEAD and staging evidence blob `02a860c812eeb777519c7917bb5c31b3fb3dd5e2`. That later activation may insert exactly eight policies and nothing else.
