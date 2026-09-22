# ANA-A10 — CAT liquidity projection

ANA-A10 defines repository authority for `liquidity.active_service_seconds` from the CAT-A06 append-only visibility ledger. It does not activate runtime/staging or promote ANA-001 above **3/6**.

## Source and ordering

ANA consumes only `private.cat_listing_visibility_events_v1` plus `private.cat_listing_visibility_ledger_state_v1`. CAT remains the lifecycle/visibility fact owner. Mutable `public.services` state and the older moderation audit are not historical supply authorities.

Replay order is `service_id + sequence_no`; `occurred_at` is an interval boundary, not a total ordering key. This matters because legitimate transitions can share one transaction timestamp.

## Fold

- `false -> true` opens supply.
- `true -> false` closes supply.
- `true -> true` splits the visible version/dimensions at the same instant.
- `false -> false` adds no active interval.
- Missing/duplicated sequence or inconsistent eligibility fails closed.
- A first fact with `eligible_before=true` is left-truncated evidence; ANA never invents its opening time.

## Coverage

Because staging intentionally did not baseline existing non-synthetic eligible listings, observed seconds are not automatically canonical. `observedLowerBoundSeconds` is diagnostic; `valueSeconds` remains null until coverage is complete.

Coverage is partial before CAT-A06 activation, without a complete activation baseline, on left-truncated history, when the CAT watermark stops before window end, or when CAT is stale.

## Segmentation and freshness

Category/state comes only from CAT-A06 frozen dimension snapshots; historical joins to mutable catalog rows are forbidden.

`dataThrough` is delegated to ANA-A07 `dependencyWatermark`. Runtime remains blocked until CAT has a versioned source watermark, ANA-A07 has a versioned liquidity `maxLagSeconds` policy, A04/A05 snapshot/reconciliation wiring exists, and a controlled synthetic staging canary passes.

This lot creates no migration, staging read/write, deploy, browser activation, identity stitching, backfill or production change.
