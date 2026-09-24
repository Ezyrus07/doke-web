# ANA-A07/A09 — Activation-invocation lifecycle contract

The A07/A09 freshness-policy activation lifecycle is split into independent authorities so repository approval, staging structure installation and persistent activation cannot be conflated.

## Completed repository-only activation approval

The project owner explicitly authorized repository-only activation-approval materialization against HEAD `9c54828972aa2d745491baf0c11335c00700035b`.

The completed evidence is stored at:

`reports/generated/ana-a07-a09-funnel-freshness-policy-activation-approval-evidence.json`

Bindings:

- Matrix `v1.3.132`
- policy set `ana-a07-a09-funnel-v1-r1`
- eight `v1` policies
- `maxLagSeconds=360`
- `effectiveFrom=2026-09-24T14:00:00Z`
- `effectiveUntil=null`
- original approval-envelope digest `9b4db03b33bdb7084899225fa2d08b78fdf4f87687b55e077b3a956a0aa981a5`
- runtime-enforcement evidence blob `118ca5f948f93ca09c7a7305d1b230880fa98630`
- activation authorization digest `d72f3930dffb8ba36d49c22eaebec4f20cf88121280c4201a6eb8a140a7dc494`
- activation-approval evidence digest `ca2bc22dcf252f0b1924c24ba522252cab37312ff5f436435723c0b1ceacb603`

The evidence approves one future policy-insert invocation. It does not itself authorize a staging write or execute that invocation.

## Successor repository candidate

The approved successor is now defined only as a repository candidate:

- `private.validate_a09_funnel_activation_approval_v1`
- `private.activate_a09_funnel_policy_approved_v1`
- migration `20260924144500_ana_a07_a09_funnel_policy_approved_activation.sql`
- rollback validation `045_ana_a07_a09_funnel_policy_approved_activation_validation.sql`

Both new identifiers are safely below PostgreSQL's 63-byte identifier limit.

Applying the migration only creates owner-only functions. It does not insert any freshness row. Validation 045, when later separately authorized in staging, performs a transient eight-row activation inside a transaction and rolls it back.

## Current authority

Repository approval evidence authority and successor-candidate authority are complete.

The following remain false:

- staging mutation authority
- persistent activation invocation authority
- policy persistence authority
- runtime projection authority
- runtime snapshot authority
- snapshot publication authority
- production authority
- merge / Ready authority

Persistent policy rows remain `0`.

## Next gate

A separate explicit staging authorization is required to apply only migration `20260924144500` and execute validation `045` rollback-only. Persistent activation remains a later, separate single-use authorization.

The exact next command is defined by the contract as:

`authorize-ana-a07-a09-funnel-freshness-policy-approved-successor-staging head=<CURRENT_PR_HEAD> matrix=v1.3.132 migration=20260924144500 validation=045 activationContractId=ana-a07-a09-funnel-freshness-policy-activation-invocation-v1 policySetId=ana-a07-a09-funnel-v1-r1 activationApprovalEvidenceDigest=ca2bc22dcf252f0b1924c24ba522252cab37312ff5f436435723c0b1ceacb603 approvalEnvelopeEvidenceDigest=9b4db03b33bdb7084899225fa2d08b78fdf4f87687b55e077b3a956a0aa981a5 runtimeEvidenceBlobSha=118ca5f948f93ca09c7a7305d1b230880fa98630`

That command authorizes only successor installation plus rollback validation; it does not authorize persistent activation.
