# ANA-A10 — CAT liquidity projection

ANA-A10 defines and now validates in staging the server-side authority for `liquidity.active_service_seconds` from the CAT-A06 append-only visibility ledger. It still does not promote ANA-001 above **3/6**.

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

Coverage is partial before the certified CAT-A07 forward-coverage epoch, when no certified epoch covers the selected window, when the CAT watermark stops before window end, or when CAT is stale. Historical left-truncation remains diagnostic and is never rewritten, but it does not invalidate windows beginning at or after the certified `coverageCompleteFrom` boundary.

## Segmentation and freshness

Category/state comes only from CAT-A06 frozen dimension snapshots; historical joins to mutable catalog rows are forbidden.

`dataThrough` is backed in staging by the versioned CAT transaction-snapshot watermark. Revision-1 liquidity policy `ana-a11-liquidity-v1-r1` is now active with `maxLagSeconds=360`, and post-effective scheduled runtime proves authoritative freshness for complete post-epoch windows. Missing or expired future policies still fail closed; no implicit threshold exists.

Staging now has the A10 runtime and synthetic evidence. No deploy, browser activation, identity stitching, CAT source mutation, historical backfill or production change occurred.

## Staging evidence

Migration `20260922140215` plus compatibility follow-up `20260922140344` are applied. The earlier global/BA/SP synthetic canary remains valid historical evidence. After CAT-A07 coverage handoff and ANA-A11 policy/scheduler activation, the first real `16:00Z→16:05Z` window materialized all three required global + category/state series by `16:05:00.148650Z`; 40/40 closed windows observed through `19:20Z` were complete, authoritative and reconciled, with zero duplicate snapshot keys and a maximum publication delay of ~`0.487s` against the `60s` SLO.

## Policy and coverage handoffs

ANA-A11 owns the derivation rule `maxLagSeconds = windowStepSeconds + projectionDelaySloSeconds`. Revision 1 is persisted as `300 + 60 = 360`, and the scheduler consumes only planner-selected canonical windows.

CAT-A07 owns the forward-only supply-coverage epoch. That epoch is certified and consumed by A10 without rewriting CAT-A06 history. Pre-epoch history remains partial; qualifying post-epoch windows can be complete and authoritative when the CAT watermark and structural checks pass.
