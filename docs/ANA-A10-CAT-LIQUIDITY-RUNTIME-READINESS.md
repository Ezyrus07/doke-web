# ANA-A10 — CAT liquidity runtime readiness

This authorized staging lot materializes a server-only runtime over the CAT-A06 visibility ledger.

The CAT watermark is a transaction-snapshot read barrier, not `MAX(occurred_at)` and not projection `computedAt`. Because CAT-A06 records visibility changes synchronously with the canonical `public.services` transaction, `transaction_timestamp()` is a conservative upper bound for committed CAT facts visible in the same database snapshot.

A versioned ANA-A07 freshness policy registry is created, but **no** `maxLagSeconds` row is inserted. The repository has no approved threshold. Missing policy therefore yields `projectionState=unavailable` with `POLICY_THRESHOLD_MISSING`.

The runtime folds CAT facts by `service_id + sequence_no`, derives active intervals and frozen category/state segments, writes A04 append-only snapshots, and records A05 CAT→ANA reconciliation plus two technical DQ rollups.

Pre-activation/unbaselined supply remains partial. The diagnostic lower bound is persisted in snapshot `numerator`; canonical `value` remains null while coverage is partial.

The staging canary must reuse only the existing synthetic CAT-A06 ledger. No CAT lifecycle mutation, historical backfill, browser analytics activation, anonymous stitching, deployment or production write is part of this lot.

## Staging result

The base migration is applied as `20260922140215`; the immutable compatibility follow-up is `20260922140344`. Structural SQL validation passed. The existing seven-row CAT-A06 synthetic ledger was reused without source mutation.

The canary wrote exactly three A04 snapshots (global, BA, SP), three A05 CAT→ANA reconciliation runs, and six technical DQ rollups. All reconciliation runs were `matched`; structural-defect and left-truncated rates were zero. The CAT ledger stayed at seven rows with sequence 1–7 and the global source fingerprint was unchanged.

No freshness policy row was created. Consequently, runtime behavior remains deliberately fail-closed with `POLICY_THRESHOLD_MISSING`, `projectionState=unavailable`, partial coverage and null canonical value.
