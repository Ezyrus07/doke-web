# ANA-A07/A09 — Activation-invocation lifecycle contract

The approved A07/A09 freshness policy set is now persistently active in staging.

## Persistent activation closure

The single-use authorization bound to HEAD `e93da2286dfdafca34b7223e4ccd4f0b5a25e579` was consumed exactly once.

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

Direct post-check confirmed exactly eight matching persistent rows and no overlapping or auxiliary activation side effects.

Persistent activation evidence is stored at `reports/generated/ana-a07-a09-funnel-freshness-policy-persistent-activation-staging-evidence.json` with blob `24ddfedcb29b465f510130befe61d4e4a283e2d2`.

The activation authorization is now consumed. A second invocation is not authorized.

## Authority after activation

The active freshness policy set is authoritative in staging, but the following remain false:

- activation invocation authority for any second call
- additional policy persistence authority
- runtime projection authority
- runtime snapshot authority
- snapshot publication authority
- cron/scheduler authority
- production authority
- merge / Ready authority

ANA remains `3/6`.

## Next gate

The next unresolved step is the four-path runtime canary contract: complete, orphan, empty-window and late-fact.

Generic `prossiga` is not authorization.

The repository-only command is:

`authorize-ana-a07-a09-funnel-freshness-policy-runtime-canary-contract-repository-only head=<CURRENT_PR_HEAD> matrix=v1.3.132 policySetId=ana-a07-a09-funnel-v1-r1 persistentActivationEvidenceBlobSha=24ddfedcb29b465f510130befe61d4e4a283e2d2 canarySet=complete-orphan-empty-window-late-fact`

That future command may only prepare the canary contract/candidate in the repository. It does not authorize staging canary mutations or maturity promotion.
