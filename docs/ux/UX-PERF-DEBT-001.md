# UX-PERF-DEBT-001 — Profile hydration policy alignment

## Status

Implementation stacked on UX-CARDS-DEBT-001.

## Base

```text
ux/ux-cards-debt-001-catalog-contract
fd59de192df712ca666478064710200e94ff0a7c
```

Tracking issue: `#60`.

## Root cause

The owner, public-client and professional profile controllers diverged from the canonical loading baseline. They configured `route-and-document`, disabled preservation of already-ready content and, on the professional route, added a 220 ms artificial minimum duration.

That combination could replay structural loading during stable-shell navigation, hide a profile already known by the current boundary and impose latency unrelated to actual data or media readiness.

## Correction

All three controllers now use:

```js
skeletonMode: 'hard-load'
readyPolicy: 'after-skeleton'
preserveReadyDuringHydration: true
minDuration: 0
```

The existing watchdog budgets remain unchanged:

- owner profile: 8000 ms;
- public client profile: 8000 ms;
- professional profile: 9000 ms.

The shared `DokePageHydration` authority remains unchanged. A hard document load still receives the structural skeleton; direct stable-shell navigation and BFCache restore do not replay it. A router-requested skeleton fallback remains available.

## Media readiness

The three profile surfaces already resolve their render operation only after avatar and cover readiness settles. The strengthened contract now protects that ordering so hydration cannot publish `ready` before media commitment completes.

## Revalidation

`DokePageHydration.start()` is idempotent once a boundary reaches a terminal state. Revalidation on the same profile boundary therefore preserves visible ready content instead of restarting the loading lifecycle.

## Validation

The dedicated gate covers:

- controller syntax;
- exact hydration policies and watchdog budgets;
- hard document load;
- direct stable-shell navigation;
- BFCache restore;
- router-requested skeleton fallback;
- delayed media ordering;
- idempotent same-boundary revalidation;
- watchdog timeout;
- final loading baseline;
- shared hydration contracts;
- profile family contracts;
- navigation lifecycle audit;
- patch whitespace.

## Boundaries

No HTML, CSS, shared hydration core, services, repositories, backend, database, Supabase, staging or production behavior is modified.

## Rollback

Revert the UX-PERF-DEBT-001 commits. No data, schema or environment rollback is required.
