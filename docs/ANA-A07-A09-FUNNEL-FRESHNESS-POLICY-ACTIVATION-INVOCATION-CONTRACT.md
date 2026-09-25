# ANA-A07/A09 — Activation-invocation lifecycle contract

The approved A07/A09 freshness policy set is persistently active in staging and its one-time activation lifecycle is closed.

## Persistent activation closure

The single-use activation authorization bound to HEAD `e93da2286dfdafca34b7223e4ccd4f0b5a25e579` was consumed exactly once.

Runtime result:

- successor: `private.activate_a09_funnel_policy_approved_v1`
- original approval validated: **true**
- activation approval validated: **true**
- rows inserted: **8**
- metric version: `v1`
- max lag: `360s`
- effectiveFrom: `2026-09-24T14:00:00Z`
- effectiveUntil: `null`
- publication policy inserted: **false**
- snapshot written: **false**
- cron created: **false**

Persistent activation evidence is stored at `reports/generated/ana-a07-a09-funnel-freshness-policy-persistent-activation-staging-evidence.json` with blob `24ddfedcb29b465f510130befe61d4e4a283e2d2`.

A second invocation is not authorized.

## Canary closure

The four-path runtime canaries are certified in `reports/generated/ana-a07-a09-funnel-runtime-canary-staging-evidence.json` with blob `3b7274a391a857f2de06538f3302f6be01b06734`.

Complete, orphan, empty-window and late-fact are PASS, cleanup is PASS and no canary-window snapshot was written.

## Current authority

A later explicit repository-only authorization grants runtime projection authority at the contract layer.

- active freshness policy set authority: **true**
- runtime canary evidence authority: **true**
- repository runtime projection authority: **true**
- staging runtime flag changed by this grant: **false**
- activation invocation authority for a second call: **false**
- additional policy persistence authority: **false**
- runtime snapshot authority: **false**
- snapshot publication authority: **false**
- cron/scheduler authority: **false**
- production authority: **false**
- merge / Ready authority: **false**
- ANA maturity: **3/6**

## Next gate

The canary gate and repository projection-authority gate are closed. Any forward-only live staging `runtimeAuthority=true` alignment, runtime snapshot authority or append-only snapshot publication requires a new explicit authorization.

Generic `prossiga` does not authorize those runtime-changing gates.
