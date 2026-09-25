# ANA-A07/A09 — Funnel runtime canary contract

The A07/A09 freshness policy set is active in staging with eight persistent `v1` policies at `maxLagSeconds=360`. This document defines the runtime evidence required before projection/snapshot authority can advance.

This lot is **repository-only**. No staging canary is executed here.

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

The future staging command is:

`authorize-ana-a07-a09-funnel-freshness-policy-runtime-canaries-staging head=<CURRENT_PR_HEAD> matrix=v1.3.132 policySetId=ana-a07-a09-funnel-v1-r1 persistentActivationEvidenceBlobSha=24ddfedcb29b465f510130befe61d4e4a283e2d2 canaryContractId=ana-a07-a09-funnel-runtime-canary-contract-v1 validation=046 lateFactExecutor=transient_pg_cron_second_session canarySet=complete-orphan-empty-window-late-fact`

That command may execute only the synthetic staging canaries and mandatory cleanup. It does not grant runtime projection, snapshot publication, cron persistence, production, merge or Ready authority.
