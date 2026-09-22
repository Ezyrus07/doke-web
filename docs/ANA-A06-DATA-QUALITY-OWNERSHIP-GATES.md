# ANA-A06 — Data-quality ownership and maturity gates

## Objective

ANA-A06 converts the two structural data-quality rollups already emitted by ANA-A05 into an explicit, versioned ownership and maturity-promotion contract. It does **not** create a new source of transactional truth and does not promote ANA-001 beyond **3/6** by itself.

## Root cause

`public.run_analytics_order_reconciliation_v1(...)` already records:

- `analytics_projection_missing_rate`;
- `analytics_reconciliation_mismatch_rate`.

A05 also records `health_state`, but that field alone does not define who owns remediation, what evidence floor is sufficient, or whether a known structural divergence may be accepted for maturity promotion. Leaving those decisions implicit would make the 3→4 gate subjective.

## Canonical ownership

ANA-001 owns the analytics projection and the quality gate. ORD-001 remains the canonical owner of order facts. A source-domain defect is routed to ORD-001; a projection defect is routed to ANA-001. Reconciliation never edits ORD data to make analytics agree.

This preserves **Product Analytics != observability** and does not create a second order authority.

## Gate semantics

Both currently emitted structural metrics use a minimum sample of one and zero tolerance for known divergence:

- a required rollup that is missing, `no_data`, null, or below the sample floor produces **hold**;
- an observed nonzero structural defect ratio produces **block**;
- both required ratios at exactly zero, with sufficient samples, produce **pass**.

The zero threshold is not a business-performance target or an SLO. These metrics test structural parity between canonical ORD facts and ANA projections; accepting a known mismatch would invalidate the evidence used for maturity promotion.

The other eight A05 quality metrics remain explicitly pending runtime emission and threshold authority. Their absence is **not** converted to numeric zero.

## Boundaries

This repository-only sublot performs no database access, migration, deploy, staging mutation, browser analytics activation, identity stitching, alert delivery, payment mutation, production mutation or merge. LEGAL-B03 and PAY-001 remain untouched.

A read-only staging evaluation against `private.analytics_data_quality_rollups_v1` is a separate evidence step and is not authorized by this commit. The exact future authorization phrase is:

`authorize-ana-a06-staging-readonly-gate`

## Base-drift reconciliation evidence

The PR base advanced by one SCHED-A03B commit while ANA-A06 certification was in progress. The drift was reconciled by merge commit `dd2b5d0cbe7ce2f576ee0dd3594e182af4c33c8d`, preserving both lineages without rebase or force-push. The reconciled branch is zero commits behind `com/com-001-baseline-audit`.

Canonical matrix refresh run `35672638184` completed successfully after the reconciliation and produced commit `9df754656e9df33d592272890b6f3f945fb710e0`. This evidence is repository-only: no migration was applied, no staging mutation was executed, browser analytics remained disabled, and production was untouched.

