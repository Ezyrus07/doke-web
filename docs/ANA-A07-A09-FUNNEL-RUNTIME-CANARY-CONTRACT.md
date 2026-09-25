# ANA-A07/A09 — Funnel runtime canary contract

The A07/A09 freshness policy set is active in staging with eight persistent `v1` policies at `maxLagSeconds=360`. This document defines the runtime evidence required before projection/snapshot authority can advance.

The contract originated repository-only. The complete/orphan/empty-window/late-fact staging canaries are now certified; this reconciliation lot is repository-only and grants no runtime projection, snapshot, publication, scheduler, production, merge or Ready authority.

## Canary identity authority

Validation 046 no longer binds to legacy fixed UUIDs. The canonical authority is `seed002-email-resolved`, matching `supabase/seed/002_mvp_controlled_seed.sql`.

At execution time the validation resolves:

- client: `cliente@doke.local`
- professional: `profissional@doke.local`

Resolution is fail-closed: the e-mail must exist in `auth.users`, the same UUID must exist in `public.users`, and the public projection must have the expected role plus `status=active`. The resolved UUID is then used only for synthetic canary fixtures.

The previous staging attempt failed before fixtures because validation 046 referenced retired UUIDs. Post-failure reconciliation proved zero canary services, orders, behavior rows, cron jobs and funnel snapshots. No Auth reprovisioning or seed replay is required.

## Canary service eligibility authority

The complete-path fixture must satisfy canonical ORD service eligibility; directly inserting a draft service is invalid.

Validation 046 now follows `approved-service-version` authority inside the rollback transaction:

1. create the synthetic service in draft state;
2. create one synthetic `public.service_versions` row with `review_status='approved'`;
3. set `doke.service_moderation_apply=on` locally for the transaction;
4. promote the synthetic service to `status='published'`, `moderation_status='published'` and bind `approved_version_id` to the approved version;
5. assert service/version/professional linkage and eligibility;
6. only then create the requested order.

The previous attempt failed with `DOKE_ORDER_SERVICE_NOT_ELIGIBLE` before the order was created. Rollback reconciliation proved zero residual services, service versions, orders, behavior rows, order metric rows and canary cron jobs. This was a fixture defect, not an ORD runtime defect.

## Canary set

### Complete

A synthetic acquisition-to-order journey must traverse:

`impression → click → detail → budget_cta → quote_started → quote_completed → quote_submitted → order_requested`

The isolated window must produce one valid subject at every stage. The projector must remain compute-only and snapshot publication must remain disabled.

### Orphan

One synthetic `search.result_clicked` with no matching impression must increment `searchOrphanClicks` by exactly one without entering the strict funnel or changing the valid-click numerator.

### Empty window

A reserved closed window must first be proven empty in both canonical sources. The projector must return all eight metrics with `sampleCount=0` and JSON `null` values, not numeric zero. Both behavior and cross-domain `dataThrough` must reach `windowEnd`.

### Late fact

This case cannot be faked with a single-session insert. The certified A07 watermark is based on the active transaction floor, so late-fact evidence requires a real second session.

The protocol uses a transient `pg_cron` writer:

1. create exact-marker synthetic service/order fixtures and a complete behavior journey;
2. retain the canonical `order_domain_event` but temporarily remove only the synthetic `order_metric_events` projection;
3. schedule a second-session writer whose transaction starts before the canary `windowEnd`;
4. while that writer is active, prove `dataThrough = earliest xact_start - 1µs` and final requested numerator remains 0;
5. after commit, recompute the same window and prove requested numerator becomes 1 with denominator still 1;
6. write no snapshots;
7. unschedule the transient job and remove every exact-marker fixture, then prove zero residue.

This proves materialization timing and watermark behavior rather than merely inserting an old timestamp.

## Candidate validation

`supabase/tests/046_ana_a07_a09_funnel_runtime_canary_validation.sql`

Validation 046 covers complete, orphan and empty-window in one transaction and ends in `ROLLBACK`.

The late-fact case is a separately orchestrated second-session protocol under the same future staging authorization because a serialized connector call cannot prove concurrent transaction-floor behavior.

## Certified staging evidence

The four-path staging canary set is certified in `reports/generated/ana-a07-a09-funnel-runtime-canary-staging-evidence.json` (blob `3b7274a391a857f2de06538f3302f6be01b06734`).

- validation 046: **PASS**
- complete: **PASS**
- orphan: **PASS**
- empty-window: **PASS**
- late-fact: **PASS**
- certified writer: job `11`, run `154490`
- window: `2026-09-25T13:28:49.777920Z` → `2026-09-25T13:33:49.777920Z`
- writer xact start: `2026-09-25T13:33:12.644938Z`
- transaction floor: `2026-09-25T13:33:12.644937Z`
- predecessor delta: **1µs**
- pre-commit final metric: **0/1**
- post-commit same-window final metric: **1/1**
- snapshot writes: **0**
- cleanup: **PASS**
- persistent active policies after cleanup: **8**

Writer job `10` / run `154483` succeeded but its observer arrived after commit; it is retained as an inconclusive observation with no certification impact. Job `11` is the certified concurrent-writer proof.

Runtime projection authority remains **false**. Runtime snapshot authority and snapshot publication authority also remain **false**.

## Current authority

- repository canary contract: **true**
- staging canary execution: **false**
- runtime projection authority: **false**
- runtime snapshot authority: **false**
- snapshot publication authority: **false**
- persistent scheduler authority: **false**
- production / merge / Ready: **false**
- ANA maturity: **3/6**

## Next gate

Generic `prossiga` is not authorization.

The next command is repository-only:

`authorize-ana-a07-a09-funnel-runtime-projection-authority-repository-only head=<CURRENT_PR_HEAD> matrix=v1.3.132 policySetId=ana-a07-a09-funnel-v1-r1 canaryContractId=ana-a07-a09-funnel-runtime-canary-contract-v1 canaryStagingEvidenceBlobSha=3b7274a391a857f2de06538f3302f6be01b06734 runtimeProjectionAuthority=true`

That command may grant only runtime projection authority at the repository-contract layer. It does not grant runtime snapshot authority, snapshot publication, persistent cron, production, merge or Ready authority.
