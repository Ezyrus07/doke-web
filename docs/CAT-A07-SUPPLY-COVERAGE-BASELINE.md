# CAT-A07 — Supply coverage baseline

## Why CAT-A06 remains partial

CAT-A06 correctly refused to fabricate history. That means a listing which was already visible before ledger activation can stay visible without ever receiving a post-activation opening event. Waiting longer does not necessarily eliminate that gap.

The original CAT-A06 activation row is historical evidence and must not be rewritten.

## Forward-only strategy

CAT-A07 defines a new **coverage epoch**, observed at a server transaction timestamp. It does not claim when a listing originally became visible.

The future baseline transaction must scan the current catalog and append one `activation_baseline` occurrence for every current service:

- with prior ledger history, `eligible_before` equals the latest `eligible_after`;
- without prior history, `eligible_before=false`;
- `eligible_after` equals current CAT public-visibility eligibility;
- visible version and category/state are frozen only when currently eligible;
- each service receives its next monotonic `sequence_no`;
- `cat-a07:baseline:<runId>:<serviceId>` is the idempotency key.

This includes currently ineligible services as `false -> false`; that proves the complete catalog state at the coverage epoch instead of proving only the visible subset.

## Fail-closed preflight

The baseline is not a repair mechanism. If the latest CAT-A06 fact disagrees with current eligibility, visible version or dimensions, the run aborts. If a source service disappeared while its latest ledger state is still eligible, the run also aborts.

No current service row or old ledger row is edited to make those checks pass.

## Coverage semantics

A separate append-only CAT coverage-epoch record is certified only after the complete scan, event/service reconciliation and fingerprints pass.

- windows before `coverageCompleteFrom`: always partial;
- windows at/after a certified `coverageCompleteFrom`: may become complete if later CAT events remain structurally valid and ANA freshness also passes.

ANA-A10 will require a later runtime migration to consume this epoch. Until that occurs, the current staging runtime remains partial.

CAT-A07 is repository-only. It performs no migration, staging read/write, lifecycle mutation, ledger mutation, backfill, deployment or production change.
