# CAT-A06 — Listing Visibility Timeline / Supply Ledger

## Status

`repository-only contract ready; migration required`

This sublot exists because ANA-A04 defines `liquidity.active_service_seconds` as CAT-owned supply time, but mutable `services.status` cannot reconstruct history.

## Read-only finding

CAT already owns the service lifecycle:

- content/version changes go through the versioned moderation authority;
- owner pause/reactivate/archive goes through `public.transition_owned_service_lifecycle`;
- browser roles do not have generic `services` write grants;
- public catalog eligibility is stricter than status alone: the service must be published, have a valid approved version, and be in an allowed moderation state.

`public.service_moderation_events` is useful audit history, but it is **not** a canonical supply ledger.

### Root cause

The current visibility trigger builds its idempotency key from:

`service + old status + new status + selected version`

and inserts with `ON CONFLICT (event_key) DO NOTHING`.

Therefore:

1. publish/paused cycles can repeat on the same approved version;
2. the repeated transition generates the same key;
3. the later business occurrence can be silently dropped;
4. replay can no longer reconstruct every `[visible_from, visible_until)` interval.

There is a second structural gap: the visibility trigger runs only on `UPDATE OF status`. A newly approved version may replace the visible version while the listing remains published. That change matters for category/region segmentation even though the service never became invisible.

Migration 044 also does not fabricate historical visibility events. That is correct: pre-ledger supply must remain partial rather than inferred from mutable current state.

## Canonical ownership

The future ledger belongs to **CAT-001**. It must observe transitions caused by the existing CAT lifecycle/moderation authorities; it must not introduce another lifecycle writer.

ANA is a read-only consumer of the resulting CAT facts.

## Canonical eligibility

Supply is active only when the canonical public-catalog eligibility predicate is true:

- service status is `published`;
- `approved_version_id` exists;
- the referenced version belongs to the same service/professional and is `approved`;
- moderation state is one of `published`, `changes_pending_review`, or `changes_required`.

Approval by itself is not visibility.

## Required ledger semantics

The future implementation must be append-only and server-owned. Every authoritative occurrence needs an occurrence-unique source key and a monotonic per-service sequence. Replaying by `service_id, sequence_no` must be deterministic.

Minimum facts per transition:

- service identity;
- per-service sequence;
- server-authoritative occurrence timestamp;
- source CAT authority / source mutation identity;
- eligibility before/after;
- visible approved version before/after;
- frozen category + state/region dimensions after the transition;
- coverage kind.

Interval rules:

- `false -> true`: open supply;
- `true -> false`: close supply;
- `true -> true` with visible version/dimension change: split at the same timestamp, with no supply gap;
- `false -> false`: no active supply interval.

Pause, archive, removal or moderation only close supply when the eligibility predicate becomes false. Reactivation/republication only open supply when the predicate becomes true. A keep-public pending edit keeps the old approved version visible until approval.

## Activation baseline

A staging migration may observe currently eligible listings **at activation time** and open coverage from that server timestamp. It may not claim those listings were visible before that instant.

Accordingly:

- post-activation coverage can become complete after transition capture is proven;
- all earlier windows remain `partial`;
- no historical backfill may manufacture old publication timestamps from current rows.

## ANA boundary

ANA may derive `liquidity.active_service_seconds` only from the CAT ledger. It must not reconstruct supply from current `services`, infer missing visibility from moderation audit rows, or treat `version_approved` as visibility without the CAT eligibility transition.

Freshness and closed-window selection remain owned by ANA-A07.

## Execution boundary

This commit creates **no migration**, performs **no staging read/write**, deploys nothing, changes no data, and does not alter ANA maturity.

ANA remains **3/6**.

The next write requires explicit authorization:

`authorize-cat-a06-listing-visibility-timeline-staging-migration`
