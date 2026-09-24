# ANA-A07/A09 — Activation-invocation authorization contract

The approval envelope and its runtime enforcement are now certified in staging, but that does **not** authorize policy persistence.

This repository-only contract defines the next explicit authorization boundary for `ana-a07-a09-funnel-v1-r1`.

## Immutable bindings

- policy set: `ana-a07-a09-funnel-v1-r1`
- Matrix: `v1.3.132`
- eight `v1` funnel metrics
- `maxLagSeconds=360`
- `effectiveFrom=2026-09-24T14:00:00Z`
- `effectiveUntil=null`
- approval-envelope evidence digest: `9b4db03b33bdb7084899225fa2d08b78fdf4f87687b55e077b3a956a0aa981a5`
- runtime-enforcement evidence blob: `118ca5f948f93ca09c7a7305d1b230880fa98630`
- staging runtime-enforcement migration: `20260924141356`
- validation `044=PASS`

## Future activation successor

Any later activation-capable function must use the canonical identifier `private.activate_a09_funnel_policy_approved_v1`, which is within PostgreSQL's 63-byte identifier limit. It must remain owner-only, validate both the original approval envelope and a new single-use activation approval evidence object, insert exactly eight freshness-policy rows, reject overlap/replay, and perform no snapshot, publication-policy or cron mutation.

No successor is created in this lot.

## Authorization boundary

Generic `prossiga` is not activation authorization. No values may be inferred.

The future command must use the exact contract template stored in `config/ana-a07-a09-funnel-freshness-policy-activation-invocation-contract.json`, with `head` equal to the then-current PR HEAD.

Until that explicit command exists:

- `activationAuthorizationAuthority=false`
- `activationInvocationAuthority=false`
- `policyPersistenceAuthority=false`
- `freshnessPolicyRowsPersisted=0`

This contract performs no staging mutation and does not change production, merge state or Ready-for-review state.
