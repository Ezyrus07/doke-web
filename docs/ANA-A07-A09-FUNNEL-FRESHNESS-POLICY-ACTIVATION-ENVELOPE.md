# ANA-A07/A09 — Funnel freshness policy activation envelope

This is the repository-only approval envelope for `ana-a07-a09-funnel-v1-r1`. It records the project-owner decision for the revision-1 effective window without invoking staging activation.

## Approved binding

- source HEAD: `0c45856b82b08fe5265c3e71b40c0d83fed871a7`
- Matrix: `v1.3.132`
- policy set: `ana-a07-a09-funnel-v1-r1`
- revision: `1`
- metric version: `v1`
- metric count: `8`
- window reference: `300s`
- projection-delay budget: `60s`
- max lag: `360s`
- effectiveFrom: `2026-09-24T14:00:00Z`
- effectiveUntil: `null`
- authorization SHA-256: `4a96845c66599a0092e34d0bf02c41684c8eaccf8768c403b648159bc53ddc2a`
- evidence SHA-256: `9b4db03b33bdb7084899225fa2d08b78fdf4f87687b55e077b3a956a0aa981a5`

## Repository-only approval envelope

The explicit authorization is bound to the exact repository HEAD, Matrix version, policy set, eight policy identities, threshold, effective window and fail-closed boundaries. The evidence digest is deterministic and validated by repository conformance tests.

## Runtime boundary

Runtime binding is still pending. The currently installed staging function `private.activate_analytics_a09_funnel_freshness_policy_v1(text,timestamptz,timestamptz)` does not accept approval evidence and therefore cannot verify the repository HEAD, Matrix version, authorization digest or evidence digest before inserting rows.

Because of that gap, this lot grants no activation invocation authority. No policy row is persisted, no snapshot is published, no cron is created and no staging or production mutation is performed.

## Next gate

Before real activation, create a separately authorized approval-aware runtime-enforcement successor. That successor must bind this exact envelope before any of the eight freshness-policy rows can be persisted. Staging application/validation and the later activation invocation remain separate authorizations.
