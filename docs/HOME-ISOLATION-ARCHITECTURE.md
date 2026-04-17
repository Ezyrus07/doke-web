# Home isolation architecture

## Ownership

### core
- `assets/css/core/index.css`
- `assets/css/core/layout.css`
- `assets/css/core/layout-shell.css`
- `assets/css/core/layout-topbar.css`
- `assets/css/core/layout-responsive.css`
- `assets/css/core/base.css`
- `assets/css/core/tokens.css`
- `assets/css/core/components.css`

Core now owns only foundation: tokens, reset/base, layout primitives, shared UI, and responsive infrastructure.

### components
- `assets/css/components/shell/app-shell.css`

Components now own the reusable application shell used by internal pages:
sidebar chrome, drawer behavior, workspace spacing, mobile shell controls.

### pages
- `assets/css/pages/home.css`
- `assets/css/pages/home-shell.css`
- `assets/css/pages/home-search-chrome.css`
- `assets/css/pages/home-refresh.css`
- `assets/css/pages/home-sections.css`
- `assets/css/pages/home-overlays.css`

Pages own home-only shell behavior, hero, sections, overlays and home composition.

## What changed
- Removed `core/shell-home.css` from the core import chain.
- Home shell rules moved behind the home page manifest via `pages/home-shell.css`.
- Added `components/shell/app-shell.css` for non-home screens.
- Added `core/index.css` so all pages load the full core stack, including `layout-responsive.css`.
- Removed `home.css` from `pedidos.html`, `notificacoes.html` and `resultados.html`.
- Removed `home-index-shell` and `home-index-topbar` from non-home pages.
- Removed the accidental `search-results.css` link from `index.html`.

## Why this is safer
- Home rules cannot style internal pages unless those pages explicitly opt into the home manifest.
- Core no longer imports page CSS.
- Internal pages share a reusable shell component instead of borrowing the home shell.

- Moved layered home surfaces from `home-refresh.css` into `home-overlays.css` so the runtime split matches the declared ownership.

- Split the home hero/search chrome into `pages/home-search-chrome.css` so page chrome stops sharing a giant file with later responsive cleanup.

- Moved desktop search control fixes to `home-search-chrome.css` and final section normalization to `home-sections.css`.

- Adjusted the home manifest import order so search/chrome desktop rules load after refresh/overlay layers while mobile still keeps final override priority.

- After stabilizing import order, desktop-only force overrides were removed from `home-refresh.css` to make the cascade less brittle.

- Navigation now bypasses shell swapping when entering or leaving `index.html`; the home runtime is heavy enough that full document navigation is currently more stable than DOM swapping.

- Re-enabled shell swapping for `index.html` transitions and added prefetching of styles, scripts and HTML documents so home <-> internal navigations stay in-app without the forced reload from commit12.

- Internal shell navigation now isolates initializer failures; errors in home/runtime bootstrap no longer automatically degrade into a full page reload when moving to `index.html`.
