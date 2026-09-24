# ANA-A07/A09 — Activation approval and successor candidate

The project-owner repository-only activation approval has been materialized for `ana-a07-a09-funnel-v1-r1`.

## Approval binding

- authorized HEAD: `9c54828972aa2d745491baf0c11335c00700035b`
- Matrix: `v1.3.132`
- approval-envelope evidence digest: `9b4db03b33bdb7084899225fa2d08b78fdf4f87687b55e077b3a956a0aa981a5`
- runtime-enforcement evidence blob: `118ca5f948f93ca09c7a7305d1b230880fa98630`
- effectiveFrom: `2026-09-24T14:00:00Z`
- effectiveUntil: `null`
- authorization SHA-256: `d72f3930dffb8ba36d49c22eaebec4f20cf88121280c4201a6eb8a140a7dc494`
- activation-approval evidence SHA-256: `ca2bc22dcf252f0b1924c24ba522252cab37312ff5f436435723c0b1ceacb603`

The completed evidence records `policyInsertAuthorized=true` and `activationInvocationLimit=1` as the approved future operation. That does **not** grant current staging mutation or invocation authority; those remain separate gates.

## Successor candidate

The repository candidate is:

- migration: `supabase/migrations/20260924144500_ana_a07_a09_funnel_policy_approved_activation.sql`
- validation: `supabase/tests/045_ana_a07_a09_funnel_policy_approved_activation_validation.sql`
- activation-approval validator: `private.validate_a09_funnel_activation_approval_v1`
- approved successor: `private.activate_a09_funnel_policy_approved_v1`

Both function identifiers are within PostgreSQL's 63-byte limit.

The successor validates:

1. the original approved envelope through the already-installed runtime validator;
2. the new activation-approval evidence, including raw authorization digest;
3. the approved envelope digest and staging runtime-enforcement evidence blob;
4. HEAD/Matrix bindings and the exact effective window;
5. single-use boundaries.

Only then can it insert exactly eight `v1` freshness-policy rows at `max_lag_seconds=360`. It inserts no publication policy, writes no snapshot and creates no cron.

## Current boundary

This lot is repository-only.

- successor migration applied in staging: **false**
- validation 045 executed in staging: **false**
- activation invoked: **false**
- persistent freshness-policy rows: **0**
- production/merge/Ready: unchanged

The next gate is a separate staging authorization to apply only the successor migration and execute validation `045` rollback-only. Persistent activation remains a later, separate authorization.
