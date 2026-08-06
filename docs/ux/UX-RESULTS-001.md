# UX-RESULTS-001 — Canonical Results Composition

## Status

Foundation increment: immutable presentation authority and accepted-receipt guard.

## Dependency chain

```text
UX-SEARCH-001
→ UX-FILTERS-001
→ UX-FILTERS-002
→ UX-RESULTS-001
```

Base head:

```text
ac35d291757b9c14af2525a6c6eee1f28ae7b7cb
```

Tracking issue: `#73`.

## Root cause

The Resultados page currently has more than one visual writer:

- `search-results.js` owns local modes, grids, summary, count and page state;
- `server-results-surface.js` also writes summary, count, pagination, fallback and errors for services;
- related sections are cleared and hidden independently;
- visual writes are not derived from one accepted immutable snapshot.

The approved search authority already prevents stale data receipts. This increment creates the equivalent presentation boundary before DOM integration.

## Authority

```text
Doke.searchResultsPresentation
version: 20260805-ux-results-001-v1
contract: search-results-presentation-v1
```

The authority publishes:

- frozen mode, state, operation, authority and coverage registries;
- immutable visual models;
- distinct loading, pagination, ready, empty, fallback, error, stale and cancelled semantics;
- replace, preserve, append and no-op content policies;
- related-section ownership by search fingerprint;
- honest local/editorial authority for users, workers and publications;
- sanitized diagnostics without raw query text;
- an accepted-receipt controller that rejects stale generations, mismatched fingerprints and unapplied receipts.

## Accepted receipt rule

```text
active intent generation + fingerprint
AND receipt.applied === true
AND state is committable
→ next visual snapshot
```

Any stale, cancelled, mismatched or unapplied receipt leaves the current accepted snapshot unchanged.

## Pagination rule

Pagination starts with `contentPolicy=preserve`. A successful accepted page resolves with `contentPolicy=append`. Existing cards remain visible while the next page is loading.

## Related sections

A related section is visible only when:

- the primary mode is `services`;
- its count is greater than zero;
- its owner fingerprint equals the current accepted intent fingerprint.

This prevents sections from a previous query from appearing below a newer result set.

## Privacy

`diagnosticFor()` excludes raw query text and location/filter values. It exposes only technical state such as generation, fingerprint, mode, state, count, authority, coverage, pagination availability and error code.

## Current boundaries

This foundation increment does not:

- render or mutate DOM;
- change `search-results.js` or `server-results-surface.js`;
- change ranking, repositories, services, RPCs or Edge Functions;
- access staging or production;
- merge any stacked pull request.

## Next increment

Wire the authority before the legacy Resultados renderer and introduce a single DOM adapter for summary, count, state, pagination and related sections. The adapter must preserve existing canonical card components and the three approved search/filter authorities.

## Rollback

Remove:

- `assets/js/pages/search-results-presentation.js`;
- `scripts/test-ux-results-001-presentation-foundation.js`;
- `.github/workflows/ux-results-001-presentation-foundation.yml`;
- this document.

No remote data or schema rollback is required.
