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

Coverage is partial before CAT-A06 activation, without a complete activation baseline, on left-truncated history, when the CAT watermark stops before window end, or when CAT is stale.

## Segmentation and freshness

Category/state comes only from CAT-A06 frozen dimension snapshots; historical joins to mutable catalog rows are forbidden.

`dataThrough` is now backed in staging by the versioned CAT transaction-snapshot watermark. A04/A05 snapshot and reconciliation wiring plus the controlled synthetic canary are closed. Authoritative freshness remains blocked only because no versioned liquidity `maxLagSeconds` policy is approved; the runtime therefore returns `POLICY_THRESHOLD_MISSING` fail-closed.

Staging now has the A10 runtime and synthetic evidence. No deploy, browser activation, identity stitching, CAT source mutation, historical backfill or production change occurred.

## Staging evidence

Migration `20260922140215` plus compatibility follow-up `20260922140344` are applied. The global/BA/SP canary appended three snapshots and three matched CAT→ANA reconciliation runs, plus six healthy technical DQ rollups. CAT remained 7 rows with sequence 1–7 and the global source fingerprint stayed unchanged. No freshness policy row was inserted, so all snapshots correctly remain `projectionState=unavailable`, `coverageState=partial`, `value=null`.

## Policy and coverage handoffs

ANA-A11 now owns the derivation rule for the missing freshness threshold: `maxLagSeconds = windowStepSeconds + projectionDelaySloSeconds`. All three values remain unset because no analytics publication cadence/SLO is currently authoritative.

CAT-A07 now owns the only acceptable path to complete supply coverage: a forward-only CAT baseline and separately certified coverage epoch. It does not rewrite the CAT-A06 activation row or infer prior publish times. The current A10 runtime remains partial until that future epoch is implemented and consumed.
