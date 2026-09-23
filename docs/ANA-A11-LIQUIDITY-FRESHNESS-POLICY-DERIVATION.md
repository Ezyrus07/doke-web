# ANA-A11 — Liquidity freshness policy derivation

## Root cause

The remaining freshness blocker is not merely a missing number. There is no canonical ANA publication cadence for `liquidity.active_service_seconds`. The ANA domain currently owns no cron, and the repository has no metric-specific `maxLagSeconds` authority.

Using the ORD one-minute worker cron, REL daily SLO report, request-freshness windows, retry backoff or browser refresh behavior would cross domain boundaries and manufacture an analytics SLA.

## Derivation rule

For the latest canonical closed-window series:

`maxLagSeconds = windowStepSeconds + projectionDelaySloSeconds`

- `windowStepSeconds` is the distance between successive canonical closed-window boundaries.
- `projectionDelaySloSeconds` is the approved maximum delay after a boundary before its snapshot should exist and be selectable.

No implicit recovery grace is added. CAT source-watermark delay is evaluated independently by ANA-A07 and must not be hidden inside the age threshold.

This rule reflects the worst healthy age of the latest published closed window immediately before the next expected publication.

## Source-domain watermark semantics

For liquidity v1, CAT remains the source authority. ANA consumes the server-side `private.cat_listing_visibility_watermark_v1()` contract with basis `transaction_snapshot_barrier_v1`.

- The watermark means CAT listing-visibility facts are proven readable through that point in the same database snapshot used by ANA.
- Canonical `dataThrough` is bounded by `min(windowEnd, CAT source watermark)`.
- A window whose `windowEnd` is later than the CAT watermark is not closed for ANA.
- `max(event.occurred_at)` is not a watermark.
- Snapshot `computedAt` is not a watermark.
- CAT dependency lag is not added to `maxLagSeconds`; dependency availability and ANA publication age remain separate gates.

## Fresh / stale / unavailable

ANA-A11 inherits the canonical state semantics from ANA-A07 and does not create a second freshness model.

- **unavailable:** threshold missing, authoritative dependency watermark missing/unavailable, no canonical closed window, required coverage missing, overclaimed `dataThrough`, or a structural defect that makes the selected liquidity projection unavailable;
- **stale:** the selected canonical window exceeds the approved lag threshold, an authoritative dependency is stale, or supply coverage is partial;
- **fresh:** the latest canonical closed window is fully covered, dependency watermarks are available, structural integrity passes, and `evaluatedAt - dataThrough <= maxLagSeconds`.

Freshness is evaluated only after selecting the latest canonical closed window. Falling back to an older healthy window is forbidden. A zero-sample window is not stale merely because it is empty.

## Pending authority decisions

The missing values remain policy decisions, not constants to infer from existing timings:

1. ANA-001 must approve and version the canonical closed-window cadence (`windowStepSeconds`).
2. ANA-001 operational policy must approve and version the healthy post-boundary materialization delay (`projectionDelaySloSeconds`).
3. ANA-001 must choose a server-side publisher/scheduler with deterministic missed-window handling.

Read-only staging inspection found the liquidity runner present but no active `cron.job` matching ANA/analytics/liquidity. GitHub Actions are repository gates, not the publication scheduler. Therefore no existing runtime authority justifies a numeric cadence or delay SLO.

## What remains unset

The repository currently has neither a versioned window step nor a projection-delay SLO for this metric. Therefore:

- `windowStepSeconds = null`;
- `projectionDelaySloSeconds = null`;
- `maxLagSeconds = null`;
- the staging registry remains empty for this metric;
- ANA-A10 must continue returning `POLICY_THRESHOLD_MISSING`.

## Activation gate

A future activation requires a versioned publication schedule, a versioned delay SLO, a server-side trigger/scheduler, controlled staging evidence of that cadence, the mechanically derived threshold, and a separately authorized insert into the freshness-policy registry.

ANA-A11 structural planner/executor/activation functions are now installed in staging, but no publication/freshness policy row or scheduler is active. Production remains untouched and ANA-001 remains **3/6**.

## Scheduler topology readiness

Read-only reconciliation now closes the mechanism question without creating a schedule. The selected future topology is **Supabase `pg_cron` invoking `private.run_analytics_cat_liquidity_catch_up_v1`**, which must pass through the canonical planner before window orchestration and the A10 per-series runner.

This is an architectural selection, not scheduler activation:

- the A11 catch-up executor is database-local, `SECURITY DEFINER` and owned by `postgres`, and delegates to the planner/window/A10 chain;
- existing Doke cron jobs in staging run as `postgres`;
- planner, catch-up executor and activation boundary are not executable by `anon`, `authenticated` or `service_role`;
- no ANA/liquidity cron exists today;
- introducing an Edge Function or GitHub Actions publisher would create a second authority without a runtime requirement.

Therefore `pg_cron` is the selected topology, while `schedulerActivationAuthorized=false`.

## Additional root-cause gaps

Cadence and delay SLO are necessary but not sufficient. Two structural authorities are also missing.

### Canonical window grid

The runner accepts arbitrary `windowStart/windowEnd`. A numeric `windowStepSeconds` alone does not identify which boundaries belong to the canonical series. Before activation, ANA must version the boundary anchor/alignment rule (and time-zone semantics if applicable).

Canary windows, execution time and another domain's cron boundaries are not valid substitutes.

### Canonical dimension-series enumeration

ANA-A10 requires liquidity segmentation by **category identity + state**, but the runtime exposes only a per-series runner:

`run_analytics_cat_liquidity_projection_v1(windowStart, windowEnd, serviceCategory, serviceState)`

No staging function currently enumerates the required liquidity dimension series. Existing ANA snapshots cannot be used as the enumerator because they only represent series that were already materialized and would miss a newly appearing CAT category/state pair. Mutable current catalog rows are also forbidden as historical dimension authority.

The future enumerator must derive the global series plus required category/state series from CAT-owned frozen dimension facts and the CAT-A07 forward-coverage state.

## Missed-window recovery

The existing append-only snapshot writer already supplies the necessary replay primitive:

- exact replay with unchanged source/projection fingerprints returns `NO_CHANGE`;
- divergent concurrent writes fail closed with `DOKE_ANALYTICS_METRIC_REVISION_CONFLICT`.

The scheduler contract therefore requires **oldest missing canonical closed window first** and forbids silently jumping to the latest window. The per-invocation catch-up bound remains unset; unbounded backlog processing is not authorized.

## Values still intentionally unset

The following remain `null`/unauthorized:

- `windowStepSeconds`;
- `projectionDelaySloSeconds`;
- `maxLagSeconds`;
- canonical window-boundary anchor/time-zone semantics;
- `maxCatchUpWindowsPerInvocation`;
- dimension-series enumerator activation;
- scheduler activation;
- freshness-policy insert.

The structural runtime is now present in staging, but operational policy values and scheduler activation remain unset; this does not promote ANA above **3/6**.

## Repository candidate — dimension-series orchestration

The remaining dimension-series gap now has a repository-only candidate:

- `supabase/migrations/20260923011500_ana_a11_liquidity_series_orchestration.sql`
- `supabase/tests/034_ana_a11_liquidity_series_orchestration_validation.sql`

It defines two private, owner-only helpers:

1. `private.list_analytics_cat_liquidity_series_v1(windowStart, windowEnd)`
   - emits the global series first;
   - then emits every valid category/state pair frozen in CAT-A06 facts from the certified CAT-A07 coverage epoch through `windowEnd`;
   - validates the same certified epoch and CAT transaction-snapshot watermark used by A10;
   - never joins `public.services`, `service_versions`, or another mutable catalog projection.

2. `private.run_analytics_cat_liquidity_window_v1(windowStart, windowEnd)`
   - delegates every series to the existing canonical `public.run_analytics_cat_liquidity_projection_v1`;
   - treats only `APPENDED` and `NO_CHANGE` as valid append outcomes;
   - executes all series for one window inside one SQL statement/transaction, so an uncaught series failure cannot commit a partially published window.

The category/state universe is intentionally monotonic from the certified coverage epoch. If a pair previously had supply and later reaches zero, it remains enumerable, allowing the canonical series to publish zero rather than silently disappearing.

This candidate **does not** create a cron, choose a window grid, choose a catch-up bound, insert a freshness policy, or mutate staging. Explicit staging migration authorization is still required before these functions exist remotely.

## Category identity continuity

The certified CAT-A07 epoch currently contains two valid BA category identities with different representation classes:

- canonical category UUID: `17263173-c179-455f-bd43-2c3d9a55a8fd`;
- legacy freeform category: `Limpeza`.

Read-only staging reconciliation proved that the `Limpeza` service has no `service_categories` row, no `category_id`, and no approved-version `categoryId/categorySlug`. Therefore CAT did not lose a canonical ID: the textual fallback is the frozen historical identity explicitly allowed by CAT-A06/A07.

ANA must preserve that boundary. The series candidate now lowercases the frozen fallback token because A10 category filtering is already case-insensitive, preventing casing-only duplicates such as `Limpeza` vs `limpeza`. This normalization **does not** equate a name or slug with a UUID.

If CAT later maps that legacy service to a canonical category UUID, that CAT transition starts a new UUID-backed analytical series from that point forward. The historical text-backed series is not rewritten or merged and remains enumerable so it can correctly publish zero supply. A cross-representation merge would require a separate versioned category-equivalence authority; none exists today.

## Publication policy authority

Read-only staging inspection confirmed that `private.analytics_metric_freshness_policies_v1` currently has **0 rows** and stores only the derived threshold shape: `policy_id`, metric identity, `max_lag_seconds`, and effective dates. It cannot prove how a threshold was derived.

ANA-A11 therefore separates two authorities:

- **publication policy** — approved inputs and provenance: cadence, projection-delay SLO, absolute window anchor, bounded oldest-first catch-up, selected scheduler mechanism and approval evidence;
- **freshness policy** — the derived `maxLagSeconds` consumed by the A10/A07 runtime.

The repository-only candidate `supabase/migrations/20260923012500_ana_a11_liquidity_publication_policy_authority.sql` introduces `private.analytics_metric_publication_policies_v1` with a generated `derived_max_lag_seconds = window_step_seconds + projection_delay_slo_seconds`. No row is inserted. The owner-only selector has no implicit/default policy.

Because the window model uses a fixed number of seconds, the canonical grid is mathematically defined by:

`windowAnchor + N × windowStepSeconds`

The `timestamptz` anchor fixes absolute boundaries; timezone is therefore **not an independent grid input** for this fixed-duration model. Presentation timezone may exist elsewhere, but cannot move canonical boundaries.

A later activation must atomically preserve provenance: an approved publication-policy row is the cause, and any freshness-policy row must copy its mechanically derived threshold. A hand-entered `maxLagSeconds` that cannot be traced to the effective publication policy is forbidden.

This candidate remains repository-only: no table/function exists in staging yet, no publication-policy row exists, no freshness-policy row exists, and no cron is activated.

### Effective-policy ambiguity

The publication-policy selector is intentionally fail-closed. If zero rows are effective for a metric/version at the requested instant, it returns no policy; there is no default. If more than one row is effective, it raises `DOKE_ANALYTICS_PUBLICATION_POLICY_AMBIGUOUS` rather than silently selecting the newest row.

This keeps versioned effective windows auditable even if a future operator accidentally creates overlap.

## Staging structural-authority closure

Authorization `authorize-ana-a11-structural-authorities-staging` was executed only against `doke-web-staging`.

Applied migrations:

- `20260923021120 / ana_a11_liquidity_series_orchestration`;
- `20260923021316 / ana_a11_liquidity_publication_policy_authority`.

Validation SQL `034` and `035` passed.

The series canary was rollback-only. It enumerated exactly three series for the certified CAT window: global, the canonical UUID/BA series, and the legacy `limpeza`/BA series. The first orchestration appended all three snapshots inside the transaction; exact replay returned `NO_CHANGE` for all three; rollback restored the persistent liquidity snapshot count to the original three rows.

The publication-policy canary was also rollback-only. With synthetic, explicitly non-authoritative values, `windowStepSeconds=300` and `projectionDelaySloSeconds=60` produced generated `derivedMaxLagSeconds=360`. A missing policy returned `null`; overlapping policies failed closed with `DOKE_ANALYTICS_PUBLICATION_POLICY_AMBIGUOUS`. Rollback left the publication-policy table empty.

Post-validation staging state remains:

- publication policy rows: **0**;
- freshness policy rows: **0**;
- ANA/liquidity cron jobs: **0**;
- persistent liquidity snapshots: **3**;
- browser analytics: unchanged/disabled;
- anonymous identity stitching: unchanged/disabled.

The structural authorities are now real staging runtime, but no cadence, delay SLO, window anchor, catch-up bound, freshness threshold, publication row, or scheduler has been approved. ANA therefore remains **3/6** and `POLICY_THRESHOLD_MISSING` remains the correct runtime behavior.

## Repository candidate — canonical window planner

The remaining scheduling mechanics now have a repository-only planner candidate:

- `supabase/migrations/20260923023000_ana_a11_liquidity_window_planner.sql`
- `supabase/tests/036_ana_a11_liquidity_window_planner_validation.sql`

`private.plan_analytics_cat_liquidity_windows_v1(policyId, evaluatedAt)` is intentionally policy-driven. It contains no cadence, anchor, SLO or catch-up default.

For the supplied versioned policy it:

1. reads `windowStepSeconds`, `windowAnchor`, effective dates and `maxCatchUpWindowsPerInvocation`;
2. bounds the grid below by the later of policy activation and the certified CAT-A07 coverage epoch;
3. bounds closed windows above by the earliest of `evaluatedAt`, the CAT transaction-snapshot watermark and policy expiry;
4. aligns every window to `windowAnchor + N × windowStepSeconds`;
5. asks the staging-validated CAT-backed series authority which global/category/state series belong to each window;
6. treats a window as materialized only when **every required series** has an exact-window ANA snapshot;
7. returns only missing windows, oldest first, capped by the policy catch-up bound.

This deliberately does not rely on the global snapshot as a completion marker, because historical A10 canaries could have materialized only a subset of the required dimension series.

The candidate is read-only and owner-only. It inserts no snapshots, creates no cron and cannot choose policy values. Missing/unknown policy fails closed with `DOKE_ANALYTICS_PUBLICATION_POLICY_REQUIRED`.

The planner is applied to staging as migration `20260923130303 / ana_a11_liquidity_window_planner`; validation `036` passed. No concrete publication-policy row is present.

## Repository candidate — bounded catch-up executor

The execution bridge after the window planner is now explicit:

- `supabase/migrations/20260923024000_ana_a11_liquidity_catch_up_executor.sql`
- `supabase/tests/037_ana_a11_liquidity_catch_up_executor_validation.sql`

`private.run_analytics_cat_liquidity_catch_up_v1(policyId, evaluatedAt)` does not calculate policy, select arbitrary windows or schedule itself. It consumes the already-bounded, oldest-first windows from `private.plan_analytics_cat_liquidity_windows_v1` and delegates each window to `private.run_analytics_cat_liquidity_window_v1`.

This has three important properties:

- **single planning authority:** the executor cannot bypass the policy-driven planner;
- **single projection authority:** every planned window still uses the staging-validated A11 series/window orchestrator and A10 projection runtime;
- **batch atomicity:** an uncaught failure in any window aborts the executor call/transaction instead of committing only part of the catch-up batch.

The executor reads no publication-policy table directly, writes no freshness-policy row and creates no `pg_cron` job. Its only inputs are `policyId` and `evaluatedAt`; therefore it has no numeric defaults or hidden schedule authority.

The executor is applied to staging as migration `20260923130307 / ana_a11_liquidity_catch_up_executor`; validation `037` passed. It remains owner-only and unscheduled.

## Repository candidate — atomic policy activation

The final registry-coupling gap now has a repository-only candidate:

- `supabase/migrations/20260923025000_ana_a11_liquidity_policy_activation.sql`
- `supabase/tests/038_ana_a11_liquidity_policy_activation_validation.sql`

`private.activate_analytics_cat_liquidity_policy_v1(...)` is the only proposed canonical write path for the first liquidity publication policy. It accepts every operational value explicitly; it contains no cadence, SLO, anchor or catch-up default.

Within one transaction it:

- validates the explicit publication-policy inputs;
- computes `maxLagSeconds = windowStepSeconds + projectionDelaySloSeconds`;
- rejects overlapping publication-policy effective windows;
- rejects overlapping freshness-policy effective windows;
- inserts the publication policy;
- inserts the matching freshness policy with the same `policyId`, metric/version and effective window.

This closes a real integrity gap: A10 consumes the freshness registry directly, while A11 owns richer publication provenance. Independent inserts could otherwise leave the two registries inconsistent.

The activation boundary is owner-only, creates no cron and invokes no catch-up executor. It is applied to staging as migration `20260923130310 / ana_a11_liquidity_policy_activation`; validation `038` passed. The migration itself inserted **zero rows**, and no activation call with real policy values has been authorized.

Concrete policy values remain unset and unauthorized.

## Scheduler target reconciliation

The future scheduler target is:

`pg_cron → private.run_analytics_cat_liquidity_catch_up_v1 → private.plan_analytics_cat_liquidity_windows_v1 → private.run_analytics_cat_liquidity_window_v1 → public.run_analytics_cat_liquidity_projection_v1`

Direct cron invocation of the A10 per-series runner is forbidden because it would bypass canonical window planning and bounded oldest-first recovery.

The catch-up executor also fails closed when planner ordinals are not contiguous from `1`, preventing execution against a structurally corrupted planner result.

The topology remains unactivated: the structural functions now exist in staging, but there is still no cron, publication-policy row or freshness-policy row.



## Staging planner/executor/activation closure

Authorization `authorize-ana-a11-planner-executor-activation-structures-staging head=1825c11544a19162438c2b63c099d9e6d2b4547f matrix=v1.3.132` was executed only against `doke-web-staging` (`zwkczgewzbsorbrjuzpb`).

Applied migrations:

- `20260923130303 / ana_a11_liquidity_window_planner`;
- `20260923130307 / ana_a11_liquidity_catch_up_executor`;
- `20260923130310 / ana_a11_liquidity_policy_activation`.

Validations `036`, `037` and `038` passed.

All behavioral canaries were transactional and rollback-only. Synthetic values were used only as test fixtures and are not policy authority.

Planner evidence:

- bounded selection returned exactly 2 oldest missing windows;
- the first window required 3 CAT-backed series;
- after materializing only 1 series, the window remained incomplete with 2 series missing;
- only after all required series existed did the planner advance to the next oldest missing window.

Executor evidence:

- first catch-up invocation processed 2 windows / 6 series;
- second invocation processed the next 2 windows / 6 series;
- third replay planned 0 windows;
- direct replay of a completed window returned `NO_CHANGE 3/3`.

Fail-closed activation evidence:

- missing policy was rejected by the planner;
- invalid activation input was rejected;
- an overlapping second publication policy was rejected;
- publication + freshness rows existed only inside the rollback transaction;
- no cron was created.

Privilege boundaries for planner, executor and activation are identical: owner `postgres`, `SECURITY DEFINER`, `postgres EXECUTE=true`, and `anon/authenticated/service_role EXECUTE=false`.

Persistent post-rollback state:

- publication policy rows: **0**;
- freshness policy rows: **0**;
- ANA/liquidity cron jobs: **0**;
- liquidity snapshots: **3** (baseline restored);
- canary-window snapshots: **0**.

No `windowStepSeconds`, `projectionDelaySloSeconds`, `windowAnchor`, `maxCatchUpWindowsPerInvocation` or `maxLagSeconds` has been selected as an operational value. Scheduler activation remains separately unauthorized. ANA remains **3/6**.


## Policy approval evidence envelope

The remaining activation decision now has a repository-only approval evidence envelope:

- `config/ana-a11-liquidity-policy-approval-envelope.json`
- `scripts/lib/ana-a11-liquidity-policy-approval-envelope.js`
- `scripts/audit-ana-a11-liquidity-policy-approval-envelope.js`
- `scripts/test-ana-a11-liquidity-policy-approval-envelope.js`

The root cause was provenance, not another missing number. The staging activation function accepts any JSON object as `approval_evidence`; therefore an empty object could satisfy the current database shape without proving which values were approved, against which repository state, or for which effective window.

The envelope contract closes that ambiguity at repository level without selecting any operational value.

### Policy identity

For the first liquidity v1 policy, `policyId` is derived rather than freely selected:

`ana-a11-liquidity-v1-r<revision>`

The v1 envelope supports only lifecycle mode `initial`, and the initial revision must be `1`. A future replacement policy is outside this contract and requires a separate transition authority.

### Effective window

A completed approval must bind an explicit `effectiveFrom`. It must be UTC, not precede the recorded approval time, fall exactly on the approved `windowAnchor + N × windowStepSeconds` grid, and use `effectiveUntil=null` for the initial policy.

No timestamp is inferred from canaries, GitHub Actions, another domain's cron, or execution time.

### Approval evidence envelope

A completed envelope binds the full repository HEAD, Domain Completion Matrix version, SHA-256 of the exact explicit authorization command, approval timestamp, staging environment, metric identity, derivation/series contract IDs, policy revision and derived `policyId`, every approved operational value, and a canonical SHA-256 digest of the evidence itself.

The envelope is single-use: at most one activation invocation. It explicitly does **not** authorize scheduler activation, production, browser analytics, anonymous identity stitching or PR merge.

A generic `prossiga` is not approval and no policy value may be inferred.

### Future explicit activation command

`authorize-ana-a11-liquidity-policy-activation-staging head=<40hex> matrix=v<version> revision=1 windowStepSeconds=<int> projectionDelaySloSeconds=<int> windowAnchor=<UTC> maxCatchUpWindowsPerInvocation=<int> effectiveFrom=<UTC> effectiveUntil=null`

This defines the fields only. It does not supply real values.

### Current runtime boundary

The database boundary still accepts only object shape for `approval_evidence`; the already-applied migration was not edited by this repository-only lot. A real policy insert therefore remains unauthorized until the completed envelope is validated immediately before activation. Database-native envelope enforcement, if added, requires separate authorization.

No publication policy, freshness policy or scheduler is created by this contract. ANA remains **3/6**.
