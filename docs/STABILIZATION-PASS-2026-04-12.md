# Stabilization pass — internal shell and results pages

## Objective
Restore active pages without reintroducing cross-page CSS contamination.

## What belongs where

### Core
Foundation only: tokens, base, layout primitives, global responsive rules.

### Components
Shared shell and shared internal UI fragments.
This pass moved the list-toolbar/search-expansion behavior for `pedidos` and `notificacoes` into:
- `assets/css/components/internal/list-page-toolbar.css`

### Pages
Page composition and page-only layouts remain in:
- `assets/css/pages/pedidos.css`
- `assets/css/pages/notificacoes.css`
- `assets/css/pages/search-results.css`

## What was fixed
1. Restored shell compatibility for internal pages by adding the legacy workspace classes alongside the new shell classes in active HTML files. This prevents existing page CSS from breaking while the shell migration remains in progress.
2. Reattached the shared list-toolbar styles to `pedidos` and `notificacoes` through a component import instead of leaving them orphaned.
3. Moved the desktop width/padding behavior required by `resultados.html` into `search-results.css`, removing the hidden dependency on home page CSS.

## Why this is safer
- No page now depends on `home.css` just to render internal headers.
- The results page owns its own desktop width behavior.
- The shell migration keeps compatibility without hiding issues with ad-hoc overrides.

## Next recommended step
Refactor page selectors from `.shell-home__workspace*` to `.app-shell-page__workspace*` page by page, then remove the compatibility classes from HTML.
