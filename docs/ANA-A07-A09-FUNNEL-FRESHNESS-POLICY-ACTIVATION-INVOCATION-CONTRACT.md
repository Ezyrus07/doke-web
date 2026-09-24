# ANA-A07/A09 — Activation-invocation authorization contract

The approval envelope and runtime enforcement are certified in staging, but that does **not** authorize policy persistence.

This contract governs the future activation lifecycle for `ana-a07-a09-funnel-v1-r1`. The immediate next gate is deliberately repository-only.

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

Any later activation-capable function must use the canonical identifier `private.activate_a09_funnel_policy_approved_v1`, within PostgreSQL's 63-byte identifier limit. It must be owner-only, validate the original approval envelope plus a single-use activation approval evidence object, insert exactly eight freshness-policy rows, reject overlap/replay, and perform no snapshot, publication-policy or cron mutation.

No successor is created in this lot.

## Immediate authorization boundary — repository only

Generic `prossiga` is not authorization. No values may be inferred.

The next command is **not** a staging or activation command. It may only authorize:

1. materializing the completed activation-approval evidence in the repository; and
2. preparing an approval-aware successor **migration candidate** in the repository.

It does **not** authorize applying that migration to staging, invoking the successor, or persisting any policy row.

The exact template is stored in `config/ana-a07-a09-funnel-freshness-policy-activation-invocation-contract.json`, with `head` equal to the then-current PR HEAD.

Until that explicit repository-only command exists:

- `activationApprovalMaterializationAuthority=false`
- `successorCandidateAuthority=false`
- `stagingMutationAuthority=false`
- `activationInvocationAuthority=false`
- `policyPersistenceAuthority=false`
- `freshnessPolicyRowsPersisted=0`

Applying a future successor migration and invoking activation require separate later authorizations.
