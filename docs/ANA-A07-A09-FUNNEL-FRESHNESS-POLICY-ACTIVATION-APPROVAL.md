# ANA-A07/A09 — Activation approval and persistent policy state

The repository approval, successor staging validation and single-use persistent activation have all closed.

## Persistent state

Staging contains exactly eight approved A07/A09 freshness-policy rows:

- policy set: `ana-a07-a09-funnel-v1-r1`
- metric version: `v1`
- max lag: `360s`
- effectiveFrom: `2026-09-24T14:00:00Z`
- effectiveUntil: `null`

The activation function returned `rowsInserted=8` after validating both the original approval envelope and the activation-approval evidence.

Post-activation checks found:

- exact policy rows: **8**
- exact binding rows: **8**
- publication-policy rows created by activation: **0**
- post-activation snapshot rows: **0**
- matching A07/A09/funnel cron jobs: **0**

The single-use activation authorization has been consumed and is no longer an open write authority.

Persistent activation evidence: `reports/generated/ana-a07-a09-funnel-freshness-policy-persistent-activation-staging-evidence.json`  
Evidence blob: `24ddfedcb29b465f510130befe61d4e4a283e2d2`

## Remaining maturity gate

Complete/orphan/empty-window/late-fact runtime canaries remain pending. Until they close, runtime projection, runtime snapshot and snapshot publication authority remain false, and ANA remains `3/6`.
