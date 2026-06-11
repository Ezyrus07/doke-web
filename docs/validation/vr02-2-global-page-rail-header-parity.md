# VR02.2 — Global Page Rail + Header Parity Across Pages

## Objective
Normalize the shared visual contract between `index.html`, internal pages, marketplace pages and profile/detail pages before continuing card restoration.

This stage intentionally avoids card, carousel, category and page-specific visual restoration. The goal is to make the header, content rail and first content block follow the same axis and spacing rules.

## Root cause
After VR02.1 the header anatomy improved, but pages still differed because page CSS loaded after the layout layer could redefine widths, top spacing and header rhythm. The most visible divergence affected:

- `index.html`
- `pedidos.html`
- `perfil.html`
- `resultados.html`
- `detalhe-anuncio.html`
- other internal app pages

The issue was not a single component. It was the absence of a late layout authority for page rail, header rail and first-block spacing across page families.

## Files changed

- `assets/css/layout/page-rail-authority.css`
- `assets/css/layout/header.css`
- `assets/css/pages/home.css`
- `assets/css/pages/profile-foundation.css`
- `assets/css/pages/pedidos-foundation.css`
- `assets/css/pages/notificacoes-foundation.css`
- `assets/css/pages/carteira-foundation.css`
- `assets/css/pages/configuracoes-foundation.css`
- `assets/css/pages/comunidade-foundation.css`
- `assets/css/pages/marketplace-detail-foundation.css`
- `assets/css/pages/resultados-foundation.css`
- `resultados.html`

## What changed

### Layout authority
Added a VR02.2 block to `layout/page-rail-authority.css` to centralize:

- shared visual rail max for core visual pages;
- header rail = content rail = first block rail;
- first-block top gap;
- section gap token;
- page content top/bottom rhythm.

### Header refinements
Added a VR02.2 block to `layout/header.css` to refine:

- header height;
- control size;
- profile pill size;
- avatar size;
- lighter surface/shadow;
- location text behavior;
- tablet menu button anatomy.

### Manifest ordering
Re-imported layout authorities at the end of page manifests where page-specific CSS previously loaded after the shared layout layer.

Created `assets/css/pages/resultados-foundation.css` so `resultados.html` can use one page entrypoint and still receive the layout/header authority after the page-specific `search-results.css` rules.

## What was intentionally not changed

- Categories
- Cards
- Workers
- Publications
- Carousels
- Sidebar anatomy
- Topbar legacy markup
- Any page-specific card anatomy

## Validation

- HTML CSS links broken: 0
- CSS imports broken: 0
- CSS with unbalanced braces: 0
- Active `!important`: 0
- `npm run audit:css-import-map`: passed
- `npm run audit:essential-asset-imports`: passed-with-follow-up
- `npm run test:desktop-zoomout-contract`: passed
- `node --check assets/js/core/app.js`: passed

## Risk

Moderate-low. The stage touches global layout authority and page foundations, which is sensitive, but it does not use `!important`, does not create page-specific header hacks, and does not modify card/component anatomy.

## Next recommendation

Validate these pages in Live Server:

- `index.html`
- `pedidos.html`
- `perfil.html`
- `resultados.html`
- `detalhe-anuncio.html`
- `carteira.html`

If the header/rail/top spacing is now consistent enough, continue to `VR03 — Home Featured Cards/Destaques Restoration`.
