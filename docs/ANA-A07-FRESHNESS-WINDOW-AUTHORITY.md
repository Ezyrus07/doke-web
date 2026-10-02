# ANA-A07 — Freshness and canonical window authority

## Objective

ANA-A07 defines the authority for `dataThrough`, dependency watermarks, canonical closed-window selection and the states **fresh / stale / unavailable**. It does not create an implicit global freshness SLA and does not promote ANA-001 beyond **3/6** by itself.

## Canonical freshness model

`dataThrough` is the greatest timestamp through which every canonical dependency required by the selected metric observation is proven materialized. It is never inferred from `computedAt`, maximum event timestamp or requested window end.

For a closed window, canonical `dataThrough` is bounded by `windowEnd` and the minimum authoritative dependency watermark. An empty window may still be fresh when the source watermark proves processing through that window.

The latest canonical closed window is selected before freshness evaluation. Older non-empty, fresh or PASS windows are never used as fallback.

## Active threshold authority

No implicit default `maxLagSeconds` exists. Missing metric-specific policy remains fail-closed as **unavailable**.

Two operational authorities are currently active:

- `liquidity.active_service_seconds v1`: policy `ana-a11-liquidity-v1-r1`, `maxLagSeconds=360`, effective from `2026-09-23T16:00:00Z`;
- the eight ANA-A09 funnel metrics: policy set `ana-a07-a09-funnel-v1-r1`, each at `maxLagSeconds=360`, effective from `2026-09-24T14:00:00Z`.

The complete/orphan/empty-window/late-fact funnel canaries are certified in staging. Their evidence is bound to blob `3b7274a391a857f2de06538f3302f6be01b06734`.

## Behavior + ORD dependency watermarks

Behavior and ORD materialization times remain distinct from event times:

- behavior: `occurred_at` is event time; server-owned `received_at` is materialization time;
- ORD metrics: `occurred_at` is event time; DB-owned `created_at` is materialization time.

The behavior/ORD watermark migration and forward-only compatibility migration are applied in staging. Validation 041 passes, and the multi-session concurrent-writer canary proved the active-transaction-floor boundary with the exact one-microsecond predecessor. `runtimeWatermarkAuthority=true`.

## Repository runtime projection authority

The explicit repository-only grant bound to source HEAD `28960baecb1b495b16c3799c55a80305764db0ac`, Matrix `v1.3.132`, policy set `ana-a07-a09-funnel-v1-r1` and the certified canary evidence grants **runtime projection authority at the repository-contract layer**.

This grant performs no staging mutation. The historical A09 staging compute observation still reports `runtimeAuthority=false`; a forward-only live runtime-flag alignment, if needed, requires separate authorization.

Current boundaries:

- repository runtime projection authority: **true**
- runtime watermark authority: **true**
- runtime snapshot authority: **false**
- snapshot publication authority: **false**
- alert delivery authority: **false**
- broader staging authority: **false**
- production authority: **false**
- ANA maturity: **3/6**

A04/A05 append-only snapshot/revision semantics and latest-window no-cherry-pick selection remain mandatory for any later publication gate.
