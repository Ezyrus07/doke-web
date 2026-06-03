# Phase 34 — Results closure cleanup and compact service-card important reduction

## Scope

Baseline: `dokee-web(187).zip`.

This phase keeps the work inside the Results/Search Results area. It does not touch Home, shell, sidebar, router, messages, profile, or global card contracts.

## Root cause

The Results area still had two sources of structural debt:

1. unreferenced historical CSS files from parity/normalization/refresh cycles;
2. active compact service-card rules where presentation-level declarations still used `!important` even though the selectors are already scoped to `.search-results-body` and `data-results-mode="services"`.

## Changes

### Active CSS

Updated:

- `assets/css/pages/search-results/compact-services.css`

Removed `!important` from scoped presentation declarations only:

- `position`
- `top` / `left` / `right`
- `z-index`
- `min-height`
- `padding`
- `gap`
- `align-items`
- `justify-content`
- `align-self`
- `flex-wrap`
- `text-overflow`

Preserved `!important` for higher-risk structure:

- `display`
- grid templates
- overflow guards
- width/height
- aspect-ratio
- hidden states

### Remnant CSS

The full project ZIP removes historical Results CSS files that are not imported by active manifests. The patch ZIP includes a maintenance script for the same removal.

Run after applying the patch ZIP:

```bash
npm run maintenance:phase34-cleanup
```

## Acceptance criteria

- `resultados.html` should keep the current visual baseline.
- Search result service cards should keep their layout, badge, favorite action and CTA.
- No Home/card/shell/router behavior should change.
- No removed file should be imported by `assets/css/pages/search-results.css`, `assets/css/pages/resultados.css` or `assets/css/pages/results/index.css`.
