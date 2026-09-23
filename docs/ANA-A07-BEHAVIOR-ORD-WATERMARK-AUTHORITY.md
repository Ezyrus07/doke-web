# ANA-A07 — Behavior + ORD dependency watermark authority

## Objective

This repository-only sublot defines how ANA proves that the two source dependencies required by the canonical funnel are materialized through a timestamp:

- `private.analytics_behavior_events_v1`;
- `private.order_metric_events`.

It creates **no migration and no runtime function**. ANA remains **3/6**.

## Why max(event timestamp) is invalid

An empty period can still be completely processed, so `max(occurred_at)` cannot prove completeness. More importantly, a source transaction may still be in flight while analytics reads. A later commit could introduce a fact whose event time belongs to an older period.

Therefore the watermark is about **materialization**, not event presence.

Behavior uses:

- canonical event time: `occurred_at`;
- materialization time: server-owned `received_at`.

ORD metric facts use:

- canonical event time: `occurred_at`;
- materialization time: DB-owned `created_at` on the private projection row.

A09 must filter by both dimensions. Event time decides funnel chronology; materialization time decides whether the fact was inside the certified source snapshot.

## active_transaction_floor_v1

The runtime candidate must derive a conservative database-wide transaction floor:

1. capture `clock_timestamp()`;
2. inspect every other current-database backend with non-null `pg_stat_activity.xact_start`;
3. if there are no active transactions, the candidate boundary is the observation clock;
4. otherwise use the earliest active transaction start minus **1 microsecond**;
5. if a prepared transaction exists for the database, fail closed as **unavailable**.

The one-microsecond predecessor matters because `dataThrough` is inclusive. A transaction whose server-owned materialization time equals its transaction start must remain strictly after the published boundary until it commits.

The approach is deliberately conservative: an unrelated long-running database transaction may hold the watermark back. Correctness is preferred over falsely claiming freshness.

Staging read-only inspection on 2026-09-23 confirmed PostgreSQL 17.6, `read committed`, `track_commit_timestamp=off`, `max_prepared_transactions=0`, no prepared transactions, and no commit-sequence column on either source ledger. Those observations explain why commit timestamp and sequence shortcuts are not repository authorities.

## Funnel handoff

For behavior-only funnel metrics:

`dataThrough = min(windowEnd, behaviorWatermark)`.

For `funnel.quote_submitted_to_order_requested`:

`dataThrough = min(windowEnd, behaviorWatermark, orderWatermark)`.

Rows materialized after a previous watermark are not retroactively injected into a finalized snapshot. If their canonical event time belongs to an older period, A05 append-only revision/backfill semantics must produce a new revision.

This preserves all existing boundaries:

- no identity stitching;
- no actor/time-proximity funnel joins;
- no browser canonical write authority;
- no silent snapshot overwrite;
- no invented freshness threshold.

## Future runtime candidate

A later explicitly authorized migration may create:

- `private.analytics_transaction_floor_watermark_v1()`;
- `private.analytics_behavior_watermark_v1()`;
- `private.order_metric_watermark_v1()`.

That migration must be forward-only, server-owned, fail closed on prepared transactions, deny browser execution, and be validated with concurrent-writer, empty-window, late-fact and no-active-transaction canaries before A09 runtime activation.

No database mutation, migration, deploy, scheduler, production change, merge or Ready for review is authorized by this contract.
