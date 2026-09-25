# ANA-A07/A09 — Funnel freshness policy activation envelope

This document records the revision-1 approval chain for `ana-a07-a09-funnel-v1-r1` and its current authority state.

## Approved binding

- approval source HEAD: `0c45856b82b08fe5265c3e71b40c0d83fed871a7`
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
- approval authorization SHA-256: `4a96845c66599a0092e34d0bf02c41684c8eaccf8768c403b648159bc53ddc2a`
- approval evidence SHA-256: `9b4db03b33bdb7084899225fa2d08b78fdf4f87687b55e077b3a956a0aa981a5`

## Runtime enforcement and persistent activation

Approval-envelope runtime enforcement is installed in staging and validation 044 passes. The legacy scalar-only activation path remains tombstoned.

The approved successor `private.activate_a09_funnel_policy_approved_v1` is installed and validation 045 passes. Its single-use persistent activation authorization was consumed exactly once and inserted exactly eight freshness-policy rows.

Persistent activation evidence:

- artifact: `reports/generated/ana-a07-a09-funnel-freshness-policy-persistent-activation-staging-evidence.json`
- blob: `24ddfedcb29b465f510130befe61d4e4a283e2d2`
- persistent policy rows: **8**
- publication-policy rows created by activation: **0**
- post-activation snapshots: **0**
- matching A09 cron jobs: **0**

## Runtime canary evidence

Validation 046 plus the second-session late-fact protocol certify complete, orphan, empty-window and late-fact behavior. Cleanup left zero synthetic residue and zero canary-window snapshots.

Canonical canary evidence blob: `3b7274a391a857f2de06538f3302f6be01b06734`.

## Repository projection authority

A later explicit repository-only gate bound to source HEAD `28960baecb1b495b16c3799c55a80305764db0ac` grants runtime projection authority at the contract layer. Authorization digest: `ae527ee8a752a13493612fe50e8266e65def7c118a232a954b5fbff69a886cc5`.

That grant does not mutate staging. Runtime snapshot authority and snapshot publication authority remain false.

## Boundaries preserved

- no second activation invocation is authorized;
- no additional policy persistence is authorized;
- runtime projection authority: **true** at repository-contract layer;
- live staging runtime flag was not changed by this grant;
- runtime snapshot authority: **false**;
- snapshot publication authority: **false**;
- A09 cron/scheduler authority: **false**;
- production, merge and Ready: **false**;
- ANA remains **3/6**.

The next runtime-changing gate, if pursued, must be separately authorized and forward-only.
