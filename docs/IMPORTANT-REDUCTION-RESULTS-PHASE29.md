# Phase 29 — Results active searchbar important reduction

## Scope

This phase starts the active `resultados` cleanup after the remnant CSS removal pass.
It does not touch home, notifications, shell, router, cards, profile, or messages.

## Files changed

- `assets/css/pages/search-results.css`
- `assets/css/pages/search-results/index-rail-alignment.css`

## Decision

Removed `!important` only from low-risk searchbar/action declarations where the selector is already scoped to `body.search-results-body` or `.search-results-body` and is loaded by the results manifest.

The removed declarations are mostly:

- input reset declarations (`border`, `outline`, `background`, `box-shadow`);
- searchbar action alignment declarations (`align-items`, `justify-content`, `border-radius`, `cursor`);
- visual state declarations for hover/focus (`background`, `color`, `box-shadow`);
- local non-authoritative card text/action declarations that no longer need forced priority.

Layout-critical grid ownership, shell containment, mobile mount guards, overlay hiding, and display locks were preserved.

## Result

- `assets/css/pages/search-results.css`: `1030 -> 915` `!important`
- `assets/css/pages/search-results/index-rail-alignment.css`: `7 -> 4` `!important`
- Total removed in this phase: `118`

## Validation

- CSS brace balance checked for changed CSS files.
- `npm run audit:agent-governance` passed.
- `git diff --check` reviewed; only pre-existing CRLF warnings may appear in this repository.

## Manual visual checks recommended

When possible, validate:

- `resultado/resultados.html` desktop searchbar;
- `resultado/resultados.html` mobile searchbar;
- filter toggle button;
- search input focus state;
- service card CTA/text clipping.
