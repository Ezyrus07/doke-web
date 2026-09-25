# ANA-A07/A09 — Activation-invocation lifecycle contract

The A07/A09 freshness-policy activation lifecycle is split into independent authorities so repository approval, staging structure installation and persistent activation cannot be conflated.

## Completed repository-only activation approval

The project-owner activation approval is materialized against HEAD `9c54828972aa2d745491baf0c11335c00700035b` with Matrix `v1.3.132`.

Bindings remain:

- policy set `ana-a07-a09-funnel-v1-r1`
- eight `v1` policies
- `maxLagSeconds=360`
- `effectiveFrom=2026-09-24T14:00:00Z`
- `effectiveUntil=null`
- approval-envelope digest `9b4db03b33bdb7084899225fa2d08b78fdf4f87687b55e077b3a956a0aa981a5`
- runtime-enforcement evidence blob `118ca5f948f93ca09c7a7305d1b230880fa98630`
- activation-approval evidence digest `ca2bc22dcf252f0b1924c24ba522252cab37312ff5f436435723c0b1ceacb603`

## Successor staging closure

The approval-aware successor is now installed in staging:

- repository migration: `20260924144500_ana_a07_a09_funnel_policy_approved_activation.sql`
- staging migration version: `20260925112930`
- rollback validation: `045 PASS`
- validator: `private.validate_a09_funnel_activation_approval_v1`
- successor: `private.activate_a09_funnel_policy_approved_v1`
- owner: `postgres`
- `SECURITY DEFINER=true`
- `anon/authenticated/service_role EXECUTE=false`
- legacy activation path remains a fail-closed tombstone
- transient eight-row insertion passed and rolled back
- replay was rejected
- persistent policy rows remain `0`

Staging evidence is stored at `reports/generated/ana-a07-a09-funnel-freshness-policy-approved-successor-staging-evidence.json` with Git blob `02a860c812eeb777519c7917bb5c31b3fb3dd5e2`.

## Current authority

Successor staging installation/validation is complete. Persistent activation is **not** yet authorized.

The following remain false:

- current activation invocation authority
- current policy persistence authority
- runtime projection authority
- runtime snapshot authority
- snapshot publication authority
- cron/scheduler authority
- production authority
- merge / Ready authority

## Next gate — single-use persistent activation

Generic `prossiga` is not authorization.

The exact next command is:

`authorize-ana-a07-a09-funnel-freshness-policy-persistent-activation-staging head=<CURRENT_PR_HEAD> matrix=v1.3.132 activationContractId=ana-a07-a09-funnel-freshness-policy-activation-invocation-v1 policySetId=ana-a07-a09-funnel-v1-r1 successorMigrationVersion=20260925112930 validation=045 successorStagingEvidenceBlobSha=02a860c812eeb777519c7917bb5c31b3fb3dd5e2 activationApprovalEvidenceDigest=ca2bc22dcf252f0b1924c24ba522252cab37312ff5f436435723c0b1ceacb603 approvalEnvelopeEvidenceDigest=9b4db03b33bdb7084899225fa2d08b78fdf4f87687b55e077b3a956a0aa981a5 runtimeEvidenceBlobSha=118ca5f948f93ca09c7a7305d1b230880fa98630 effectiveFrom=2026-09-24T14:00:00Z effectiveUntil=null`

That future command authorizes exactly one persistent activation inserting exactly eight freshness-policy rows. It does not authorize snapshots, cron, production, merge or Ready.
