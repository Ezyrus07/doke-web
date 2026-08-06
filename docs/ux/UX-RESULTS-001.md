# UX-RESULTS-001 — Canonical Results Composition

## Status

Canonical presentation authority and single DOM adapter integrated into `resultados.html`.

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

The Resultados page had more than one visual writer:

- `search-results.js` owned local modes, grids, summary, count and page state;
- `server-results-surface.js` also wrote summary, count, pagination, fallback and errors for services;
- related sections were cleared and hidden independently;
- visual writes were not derived from one accepted immutable snapshot.

The search authority already prevented stale data receipts, but a stale or competing visual writer could still replace the visible composition independently.

## Presentation authority

```text
Doke.searchResultsPresentation
version: 20260805-ux-results-001-v1
contract: search-results-presentation-v1
```

The authority publishes:

- frozen mode, state, operation, authority and coverage registries;
- immutable visual models;
- distinct loading, paginating, ready, empty, fallback, error, stale and cancelled semantics;
- replace, preserve, append and no-op content policies;
- related-section ownership by search fingerprint;
- honest local/editorial authority for users, workers and publications;
- sanitized diagnostics without raw query text;
- an accepted-receipt controller that rejects stale generations, mismatched fingerprints and unapplied receipts.

## DOM adapter

```text
Doke.searchResultsDomAdapter
version: 20260805-ux-results-001-dom-v1
contract: search-results-dom-adapter-v1
```

The adapter is the single writer for:

- results title and description;
- accepted result count;
- loading, ready, empty, fallback and error surfaces;
- pagination visibility and busy state;
- result authority and coverage markers;
- related-section visibility and ownership.

Card creation remains with the existing canonical renderers. The adapter does not duplicate service, user, worker or publication card anatomy.

## Accepted receipt rule

```text
active intent generation + fingerprint
AND receipt.applied === true
AND state is committable
→ next visual snapshot
```

Any stale, cancelled, mismatched or unapplied receipt leaves the current accepted snapshot unchanged.

## Renderer responsibilities

### `search-results.js`

- continues to own query inputs, filters, local card creation and interaction listeners;
- commits users, workers and publications through the DOM adapter;
- delegates related-section cleanup to the adapter;
- passes the presentation installation to the server surface;
- retains legacy visual writes only as a fail-safe when the adapter is unavailable.

### `server-results-surface.js`

- continues to own canonical service queries, fallback requests, pagination cursors and service card append operations;
- opens one presentation ticket for each initial, retry or pagination operation;
- commits visual state only after the search receipt reports `applied === true`;
- cancels visual tickets for stale/unapplied receipts;
- restores the previously accepted snapshot when pagination fails.

## Pagination rule

Pagination starts with `contentPolicy=preserve`. Existing cards remain visible while the next page loads. A successful accepted page resolves with `contentPolicy=append`; an error restores the previous accepted visual snapshot.

## Related sections

A related section is visible only when:

- the primary mode is `services`;
- its count is greater than zero;
- its owner fingerprint equals the current accepted intent fingerprint.

Sections without current-intent ownership are hidden and cleared by the adapter.

## Privacy

`diagnosticFor()` excludes raw query text and location/filter values. The emitted presentation diagnostic contains only technical state such as generation, fingerprint, mode, state, count, authority, coverage, pagination availability and error code.

## Files

- `resultados.html`;
- `assets/js/pages/search-results-presentation.js`;
- `assets/js/pages/search-results-dom-adapter.js`;
- `assets/js/pages/search-results.js`;
- `assets/js/pages/search/server-results-surface.js`;
- `scripts/test-ux-results-001-presentation-foundation.js`;
- `scripts/test-ux-results-001-dom-adapter.js`;
- `.github/workflows/ux-results-001-presentation-foundation.yml`;
- this document.

## Preserved boundaries

This increment does not change:

- ranking or search relevance;
- repositories, service contracts, RPCs or Edge Functions;
- canonical card components;
- applied/draft filter authority;
- staging or production;
- merge or review state of any stacked pull request.

## Validation

The gate validates:

- JavaScript syntax for the authority, adapter and integrated renderers;
- immutable presentation contracts;
- DOM adapter state, pagination rollback and stale-receipt contracts;
- static script ordering and integration markers;
- UX-FILTERS-002, UX-FILTERS-001 and UX-SEARCH-001 dependencies;
- SEARCH-UX02, CARDS, PERF, RESP, A11Y, NAV, PRIV, CONT, CORE-001 and CORE-002 regressions;
- navigation lifecycle, authentication/session bootstrap and patch whitespace.

## Remaining risk

The deterministic gate validates ownership and state transitions, but it does not replace a browser-level visual review of responsive layout, focus behavior and real network timing. No staging or production environment was accessed in this increment.

## Rollback

Revert the UX-RESULTS-001 commits. No database, remote data or schema rollback is required.

## Browser acceptance harness

The Playwright harness validates desktop 1366×768 and mobile 390×844 with remote services disabled. It covers rapid latest-wins searches, preservation of accepted cards without blocking flicker, empty versus fallback, related-section ownership, pagination focus/busy/rollback/append, retry, error and compact-viewport overflow.

The harness runs against the repository static server and stores Playwright evidence. It does not access staging, production, Supabase, RPCs or external search services.

## Remaining closure work

The final QC must resolve the current SonarQube Cloud failure without suppressing findings, rerun every deterministic and browser gate on one immutable head, inspect evidence and register the definitive checkpoint.
