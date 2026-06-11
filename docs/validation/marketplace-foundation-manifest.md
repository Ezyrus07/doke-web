# Marketplace Foundation Manifest Validation

## Stage
Stage 53 — Marketplace Foundation Manifest Consolidation

## Intent
Reduce direct CSS links for marketplace-related pages without adding visual rules, deleting physical CSS files, or reactivating old authority contracts.

## Files changed
- `resultados.html`
- `detalhe-anuncio.html`
- `assets/css/pages/marketplace-foundation.css`
- `assets/css/pages/marketplace-detail-foundation.css`
- `docs/validation/marketplace-foundation-manifest.md`
- `docs/validation/marketplace-foundation-manifest-report.json`

## Consolidation performed

### Shared marketplace foundation
Created `assets/css/pages/marketplace-foundation.css` as a shared entry for the common marketplace base:

1. `assets/css/core/index.css`
2. `assets/css/pages/app-shell.css`

This file must remain a manifest only. It must not contain visual overrides, component anatomy, page distribution rules, or emergency cascade fixes.

### resultados.html
Reduced direct local CSS links from 3 to 2:

Before:
1. `assets/css/core/index.css`
2. `assets/css/pages/app-shell.css`
3. `assets/css/pages/search-results.css`

After:
1. `assets/css/pages/marketplace-foundation.css`
2. `assets/css/pages/search-results.css`

`search-results.css` was intentionally kept at its original direct-load position because early scripts sit between the former shared base CSS and the page CSS. Moving all three into one entrypoint would shift the page CSS earlier or the shared base later. That is not worth the first-paint risk in this structural stage.

### detalhe-anuncio.html
Reduced direct local CSS links from 16 to 1:

Before:
1. `assets/css/core/index.css`
2. `assets/css/pages/app-shell.css`
3. `assets/css/layout/header.css`
4. `assets/css/pages/internal-shell.css`
5. `assets/css/pages/internal-page-header.css`
6. `assets/css/pages/internal-action-surfaces.css`
7. `assets/css/components/shell/desktop-topbar.css`
8. `assets/css/components/internal/topbar-standard.css`
9. `assets/css/components/navigation/mobile-drawer-standard.css`
10. `assets/css/patterns/reviews-section.css`
11. `assets/css/components/media-lightbox.css`
12. `assets/css/components/cards/worker-card.css`
13. `assets/css/components/cards/publication-card.css`
14. `assets/css/components/sections/section-header-canonical-contract.css`
15. `assets/css/components/cards/marketplace-card-contract.css`
16. `assets/css/pages/detalhe-anuncio.css`

After:
1. `assets/css/pages/marketplace-detail-foundation.css`

The imported order inside `marketplace-detail-foundation.css` intentionally mirrors the previous direct-link order.

## Validation summary
- Active HTML CSS broken links: 0
- Active CSS import broken links: 0
- Any `assets/css` import broken links: 0
- CSS files with unbalanced braces: 0
- Active cascade `!important` files: 0
- Total dormant `assets/css` files still containing `!important`: 51

## Important note about dormant `!important`
The active cascade remains clean. The repository still contains 51 dormant CSS files with `!important` under `assets/css`. They were not edited or deleted in this stage because the current phase is manifest consolidation. Those files should be handled by the later conservative orphan/dormant CSS audit, including HTML, CSS, JS, strings, and dynamic loading checks.

## Risk
Low to moderate.

- Low for `detalhe-anuncio.html`, because its local CSS links were adjacent and the manifest preserves the previous order.
- Moderate-low for `resultados.html`, because only the shared base pair was consolidated and the page CSS stayed in its original position to avoid shifting first-paint script timing.

No visual recovery or component anatomy work was performed.
