# CSS Cleanup Stage 41 — resultados.html

## Scope
- Page: `resultados.html`
- Goal: remove legacy shell/tablet/mobile contracts from the results page cascade and eliminate active `!important`.

## Actions
- Removed late imports in `assets/css/pages/search-results.css` for legacy shell/header/rail/tablet contracts.
- Added clean `assets/css/layout/header.css` as the header authority.
- Rewrote `assets/css/pages/search-results-runtime.css` as an import-only manifest.
- Removed legacy imports from the runtime manifest for mobile shell, desktop shell, page-container, domain-card, doke-layout-system and mobile card distribution layers.
- Removed `!important` from CSS files still active in the `resultados.html` cascade.

## Results
- Active CSS files in resultados cascade: 121
- Active `!important` in resultados cascade: 0
- Global `!important` remaining in assets/css: 10891
- CSS files with unbalanced braces: 0

## Risk
High visual risk for `resultados.html`, especially search/filter UI, grids, workers, service cards and mobile/tablet composition. This is intentional in the structural cleanup phase.
