# ANA-A07/A09 — Funnel freshness policy r1

## Current state

Revision 1 for the eight canonical ANA-A09 funnel metrics is no longer merely a candidate. Its activation structure is installed, the approval-envelope enforcement and approved successor are installed, the policy set is persistently active in staging, and the four runtime canaries are certified.

Canonical policy set:

- policy set: `ana-a07-a09-funnel-v1-r1`
- metric version: `v1`
- metrics: **8**
- window reference: **300 seconds**
- projection-delay budget: **60 seconds**
- `maxLagSeconds`: **360 seconds**
- effectiveFrom: `2026-09-24T14:00:00Z`
- effectiveUntil: `null`
- persistent freshness rows: **8**
- snapshot publication rows created by activation: **0**
- cron created by activation: **0**

The threshold derivation remains `300 + 60 = 360`. The final ORD-linked metric does not receive an additional lag allowance because cross-domain completeness is already bounded by the minimum behavior/ORD watermark.

## Fail-closed semantics

- lag > 360 seconds => stale;
- missing policy => unavailable;
- dependency unavailable => unavailable;
- dependency stale => stale;
- partial window coverage => stale;
- no coverage => unavailable;
- overlapping policy windows => activation rejected;
- older healthy snapshots cannot replace the latest canonical closed window.

Policy activation does not authorize snapshot publication.

## Runtime closure

Repository migration `20260924004500_ana_a07_a09_funnel_freshness_policy_activation.sql` is installed in staging and validation 043 passes. Approval-envelope enforcement, the approved activation successor, persistent activation and validations 044/045 are also closed.

The four-path runtime canary set is certified:

- complete: PASS
- orphan: PASS
- empty-window: PASS
- late-fact: PASS
- cleanup: PASS
- canary-window snapshots written: 0
- evidence blob: `3b7274a391a857f2de06538f3302f6be01b06734`

## Projection authority boundary

Explicit repository-only runtime projection authority is now granted. This is not a staging mutation and does not rewrite the historical live compute observation.

Current authority:

- repository runtime projection authority: **true**
- live staging `runtimeAuthority` historical observation: **false**
- runtime snapshot authority: **false**
- snapshot publication authority: **false**
- persistent scheduler authority for A09: **false**
- production / merge / Ready: **false**
- ANA maturity: **3/6**

Any live runtime-flag alignment or snapshot publication requires a separate explicit gate.
