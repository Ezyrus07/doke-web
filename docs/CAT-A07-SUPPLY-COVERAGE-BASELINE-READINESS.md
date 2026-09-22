# CAT-A07 — Supply coverage baseline readiness

This repository-only readiness lot prepares the forward baseline and the ANA-A10 coverage handoff. It performs no database access and does not consume the staging authorization token.

## Serialization

The future baseline is one transaction. It locks `public.services`, `public.service_versions`, `public.service_categories`, the CAT-A06 ledger and the coverage-epoch table before comparing current state to the ledger. This prevents a "complete" epoch from being certified across moving source rows.

## Fail-closed baseline

Before any baseline event is appended, the runner rejects sequence gaps, eligibility-chain mismatches, time regressions, missing dimensions for visible states, open ledger services missing from the source, current eligibility drift and visible-version/dimension drift.

It then appends exactly one `activation_baseline` fact for every current service, including `false -> false` rows, and requires inserted-event count to equal current-service count. A post-write structural check must still be zero before the epoch is certified.

The CAT-A06 activation row is never updated.

## ANA handoff

A separate migration candidate teaches ANA-A10 to use a certified CAT-A07 `coverage_complete_from`. A window can be complete only when its `windowStart` is at or after a certified epoch. Pre-epoch windows remain partial permanently.

This handoff does not solve freshness. With ANA-A11 still lacking an approved policy, post-epoch projections remain `POLICY_THRESHOLD_MISSING`.

## Execution boundary

No staging read, staging mutation, applied migration, deploy or production action occurs in this lot. Staging execution still requires the exact CAT-A07 authorization.
