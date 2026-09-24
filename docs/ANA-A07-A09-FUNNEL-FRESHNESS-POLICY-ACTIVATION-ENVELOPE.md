# ANA-A07/A09 — Funnel freshness policy activation envelope

This document records the approved revision-1 effective window for `ana-a07-a09-funnel-v1-r1` and its current staging enforcement state.

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

## Repository approval envelope

The authorization is bound to the exact repository HEAD, Matrix version, policy set, eight policy identities, fixed threshold and effective window. The evidence digest is deterministic and repository-tested.

## Runtime enforcement — staging validated

The approval-envelope runtime enforcement is now installed and validation `044` passes in staging.

- repository migration: `20260924140000`
- staging migration version: `20260924141356`
- validator: owner `postgres`, `SECURITY DEFINER`
- `anon/authenticated/service_role EXECUTE = false`
- canonical envelope accepted
- HEAD mismatch rejected
- authorization mismatch rejected
- boundary escalation rejected
- evidence-digest mismatch rejected
- legacy scalar-only activation rejected
- persisted funnel policy rows: `0`

The legacy function `private.activate_analytics_a09_funnel_freshness_policy_v1(...)` is now a fail-closed tombstone. Runtime envelope enforcement is therefore active, but activation itself is still unauthorized and no activation-capable successor exists.

PostgreSQL truncates identifiers to 63 bytes, so the long validator identifier is stored internally as `validate_analytics_a09_funnel_freshness_policy_approval_envelop`. Existing SQL references resolve correctly, but any future activation-capable successor must use an explicit canonical identifier of 63 bytes or fewer to avoid collision risk.

## Boundaries preserved

No freshness-policy row has been persisted, no snapshot has been published, no cron has been created, production is unchanged, and PR #488 remains draft/unmerged.

## Next gate

Create a separate repository-only activation-invocation authorization contract that binds this approved envelope and the staging runtime-enforcement evidence. That contract must not itself activate or persist the eight policies. A later separate staging authorization is required for real activation.
