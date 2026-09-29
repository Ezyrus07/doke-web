# ANA-A09 — First canonical funnel snapshot append canary contract

## Purpose

This contract originally defined the **first real snapshot append canary** for ANA-A09 without executing it. The explicitly authorized first staging canary has now executed successfully, and this repository-only reconciliation records that evidence.

The canary remained intentionally narrow: one explicit UTC window, one successful invocation, exactly eight writes, and no continuous runtime snapshot, publication or scheduler authority.

## Current authority

This evidence-reconciliation repository lot grants only repository-write authority. The staging authorization was single-use and has already been consumed.

It does **not** grant:

- staging mutation;
- append invocation;
- snapshot mutation;
- runtime snapshot authority;
- snapshot publication authority;
- scheduler authority;
- production access;
- merge;
- Ready for review.

ANA remains **3/6**.

## Bound sources

The canary is bound to the staging-certified append structure:

- append contract config blob: `a2ff945493d2f4ff88d690be9277538094875652`
- staging structure evidence blob: `51919aec403111aa1e3bef7a69ca1f781025b53b`
- migration blob: `5661652eb4a428976419c46db5d66bcb0e2505b1`
- applied staging migration: `20260928141605`
- validation 052 blob: `60a6326327bf673a2f3d81a60f1f44b8609ffa17`

The runtime bridge remains:

`private.invoke_a09_canonical_funnel_snapshot_append_v1`

and neither it nor its authorization validator is executable by `anon`, `authenticated` or `service_role`.

## Window policy

The original contract did not preselect a window. The executed staging canary was later bound by read-only preflight and explicit authorization to `2026-09-29T01:55:00Z → 2026-09-29T02:00:00Z`.

A later read-only preflight must select an exact UTC interval `[windowStart, windowEnd)`. The recommended canary size is five minutes, but the timestamps themselves must be explicitly observed and bound.

The selected window is rejected if:

- it is invalid or inferred at execution time;
- the adapter does not return `payloads_computed_candidate`;
- payload count is not exactly eight;
- any target snapshot identity already exists in that exact window.

If a window is rejected and another is selected, the previous authorization cannot be reused.

## Preflight

Before any append authorization is consumed, read-only checks must prove:

1. PR #488 remains OPEN/DRAFT/UNMERGED on the exact authorized HEAD.
2. Matrix remains `v1.3.132`.
3. staging project is `zwkczgewzbsorbrjuzpb`.
4. migration ledger contains staging version `20260928141605`.
5. validator and invoker still exist and remain non-executable by client/service roles.
6. the payload adapter computes exactly eight global-funnel `v1` payloads for the exact window.
7. the target snapshot set for those payload identities is empty.

The authorization digest is SHA-256 of the exact future user command. The evidence digest must be computed using PostgreSQL's canonical `jsonb` text representation with `evidenceDigestSha256` removed, matching the runtime validator.

## Expected first invocation

The first canary is **not** an idempotency replay. It is one mutation-bearing invocation.

Expected result:

- `state = authorized_window_processed`
- `processedCount = 8`
- `appendedCount = 8`
- `noChangeCount = 0`
- every result state = `APPENDED`
- every inserted revision = `1`

Because preflight requires no pre-existing target snapshot rows, every inserted row must have `supersedes_snapshot_id IS NULL`.

## Atomic failure behavior

The invoker calls all eight A04 appends inside one PostgreSQL invocation transaction.

Any exception aborts the entire invocation. A `40001 / DOKE_ANALYTICS_METRIC_REVISION_CONFLICT` is a canary failure, not a reason to auto-retry.

Unexpected `NO_CHANGE` is also a first-canary failure because it means the supposedly empty target window was not actually empty or state changed between preflight and invocation.

There is no automatic retry.

## Postflight

A successful canary must prove:

- exactly eight result entries;
- eight `APPENDED`;
- zero `NO_CHANGE`;
- eight matching snapshot rows in the exact target window;
- returned snapshot IDs equal the observed inserted rows;
- all target revisions are `1`;
- all `supersedes_snapshot_id` values are null;
- validator/invoker privileges remain closed;
- no scheduler/publication/runtime-snapshot authority was created.

The evidence must record the exact eight snapshot IDs.

## Idempotency

A04 already implements deterministic exact replay as `NO_CHANGE` when source and projection fingerprints match.

The **first** append canary will not exercise replay. A later replay canary, if desired, requires a separate explicit authorization so the mutation-bearing first canary stays maximally bounded.

## Authorization evidence template

The committed template is:

`config/ana-a09-canonical-funnel-snapshot-first-append-canary-authorization-template.json`

It is intentionally non-executable:

- `appendInvocationAuthorized=false`
- `snapshotMutationAuthorized=false`
- `maxSnapshotWrites=0`

Only a future explicit exact-window authorization may produce a runtime evidence object with `true / true / 8`.

## Reconciled staging execution evidence

Machine-readable evidence:

`reports/generated/ana-a09-canonical-funnel-snapshot-first-append-canary-staging-evidence.json`

Evidence blob: `00579a7e725a0f6299d8db563f394cb8e11d20d5`

Observed result:

- exact window: `2026-09-29T01:55:00Z → 2026-09-29T02:00:00Z`
- `processedCount = 8`
- `appendedCount = 8`
- `noChangeCount = 0`
- eight persisted rows, eight distinct metrics
- every revision = `1`
- every `supersedes_snapshot_id IS NULL`
- all eight rows have `coverageState=complete`
- all eight rows have `projectionState=stale`, which is allowed by the contract
- validator/invoker remain non-executable by `anon`, `authenticated` and `service_role`
- A09 scheduler count remains zero
- runtime snapshot/publication/scheduler authority remains false

A first technical execution attempt aborted before the invoker because PostgreSQL planned a constant `1/0` fail-closed branch. That transaction wrote zero snapshots. The guard was replaced with a zero-row `WHERE` predicate, after which exactly one authorized invoker call succeeded.

The runtime authorization digest was:

`67933b849d4972150292c878061183fca4076326f74901b1dcd43f370a5ef8a7`

The database-canonical authorization evidence digest was:

`6124997566ad22599a996416f171ce4613663c963863b958893ec1da01c2a9e3`

ANA remains **3/6**.

## Next gate

Certify this reconciled evidence on the exact resulting repository HEAD. This does not authorize replay. A replay/idempotency canary, if desired, requires a separate explicit authorization.
