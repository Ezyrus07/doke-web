# Active legacy structures audit

This document is the current source of truth for the Doke CSS/shell cleanup. It does **not** authorize deletion by filename. It identifies which old or transitional layers are still active before any visual/layout refactor.

Generated report: `docs/validation/active-legacy-structures-report.json`

Command:

```bash
npm run audit:active-legacy-structures
```

## Current snapshot

- HTML pages scanned: 23
- CSS files in repository: 451
- JS files in repository: 139
- Direct CSS links from HTML: 139 unique paths
- Direct JS scripts from HTML: 111 unique paths
- CSS active directly or through active import chains: 302 paths
- Active/imported CSS with legacy or remediation naming: 16 paths
- Active JS with legacy or remediation naming: 0 paths
- High-risk active/imported CSS by size, `@import`, or `!important`: 83 paths

## Phase 7 note

Phase 7 removed the active JS remediation name from production links by renaming the former iPad Safari scroll rescue script to a scroll guard contract:

| Former active asset | Current active asset |
|---|---|
| `assets/js/core/ipad-safari-scroll-rescue.js` | `assets/js/core/ipad-safari-scroll-guard.js` |

The audit now tracks active remediation JS separately. It currently reports zero active remediation JS.

The import resolver was also corrected to resolve relative CSS `@import` paths against the importing file. This exposed active legacy CSS that was previously hidden behind relative imports. The increase in active/imported CSS count is an audit accuracy improvement, not a new visual regression.

## Highest-risk pages by active direct CSS load

| Page | Direct CSS | Direct JS | Direct `!important` count | Direct CSS bytes |
|---|---:|---:|---:|---:|
| `mensagens.html` | 60 | 38 | 16214 | 1401160 |
| `pedidos.html` | 58 | 50 | 10342 | 1212993 |
| `perfil.html` | 55 | 43 | 19549 | 1902229 |
| `notificacoes.html` | 51 | 37 | 9251 | 957391 |
| `carteira.html` | 48 | 36 | 11564 | 1172427 |
| `comunidade.html` | 46 | 38 | 9887 | 1040820 |
| `configuracoes.html` | 44 | 38 | 7894 | 856798 |
| `comunidade-interna.html` | 42 | 18 | 12345 | 1079256 |
| `avaliacao.html` | 32 | 20 | 7016 | 735986 |
| `detalhe-anuncio.html` | 30 | 18 | 8566 | 844024 |
| `ajuda.html` | 26 | 33 | 7419 | 715847 |
| `anunciar-servico.html` | 25 | 32 | 7111 | 704532 |

## Active legacy/remediation CSS still in the cascade

These files are active either as direct HTML links or through active import chains. They need triage before deletion or consolidation.

| File | Tokens | Status |
|---|---|---|
| `assets/css/components/before-after-workers-preview/shared-publication-card.css` | polish | active via direct link/import chain |
| `assets/css/components/layout/marketplace-index-layout-contract.css` | parity | active via direct link/import chain |
| `assets/css/pages/comunidade/mobile-layout-contract.css` | rescue | active via direct link/import chain |
| `assets/css/pages/home-overlays/workers-feed-card-layout.css` | polish | active via direct link/import chain |
| `assets/css/pages/mensagens/community-layout-contract.css` | parity | active via direct link/import chain |
| `assets/css/pages/mensagens/page-foundation-contract.css` | final | active via direct link/import chain |
| `assets/css/pages/mensagens/header-layout-contract.css` | parity | active via direct link/import chain |
| `assets/css/pages/notificacoes/pedidos-notification-layout.css` | parity | active via direct link/import chain |
| `assets/css/pages/notificacoes/selection-layout-contract.css` | parity | active via direct link/import chain |
| `assets/css/pages/perfil-budget-modal/success-state-layout.css` | final, polish | active via direct link/import chain |
| `assets/css/pages/search-results/results-layout-foundation.css` | final, normalization | active via direct link/import chain |
| `assets/css/pages/search-results/results-page-alignment.css` | parity, final | active via direct link/import chain |
| `assets/css/pages/search-results/index-rail-alignment.css` | parity | active via direct link/import chain |
| `assets/css/pages/search-results/mobile-layout-contract.css` | polish | active via direct link/import chain |
| `assets/css/pages/search-results/preview-layout-contract.css` | parity | active via direct link/import chain |
| `assets/css/pages/search-results/workers-index-rail-alignment.css` | parity | active via direct link/import chain |

## Top high-risk active CSS layers

| File | Size | `!important` | `@import` |
|---|---:|---:|---:|
| `assets/css/pages/perfil-reference-hero.css` | 286306 | 4173 | 0 |
| `assets/css/pages/mensagens/page-visual-contract.css` | 232535 | 3869 | 0 |
| `assets/css/pages/perfil/responsive.css` | 317524 | 3674 | 0 |
| `assets/css/pages/home.css` | 262410 | 3093 | 61 |
| `assets/css/components/shell/doke-shell-contract.css` | 234929 | 2662 | 0 |
| `assets/css/pages/carteira.css` | 201234 | 1897 | 0 |
| `assets/css/components/shell/desktop-page-rail-authority.css` | 148316 | 1739 | 0 |
| `assets/css/pages/mensagens/desktop-visual-repair.css` | 108612 | 1584 | 0 |
| `assets/css/pages/home/tablet-safari-layout.css` | 125616 | 1520 | 0 |
| `assets/css/components/internal/chat-workspace-contract.css` | 91231 | 1436 | 0 |
| `assets/css/pages/home-tablet-v2.css` | 98225 | 1431 | 0 |
| `assets/css/patterns/marketplace-responsive-stack.css` | 110448 | 1311 | 0 |
| `assets/css/pages/perfil/header-rail.css` | 90083 | 1167 | 0 |
| `assets/css/pages/home/mobile/sections.css` | 69492 | 1151 | 0 |
| `assets/css/pages/detalhe-anuncio/detail-page-contract.css` | 121903 | 1104 | 0 |

## Diagnosis

The project has three kinds of legacy debt:

1. **Inactive legacy**: old files that are no longer linked/imported. These mostly create maintenance noise.
2. **Active legacy**: old or transitional files still present in the runtime cascade.
3. **Dominant legacy**: large active files with hundreds/thousands of `!important` declarations that can override newer contracts and create first-paint/route-transition flashes.

The route transition flash reported on mobile is consistent with active/dominant legacy CSS because the browser first paints one contract and then receives a later shell/body/class/card contract after hydration or navigation.

## Cleanup order

1. `index.html` / home rails and mobile first paint.
2. Shared mobile shell pending/mounted state.
3. Imported legacy CSS in home/results/profile/notifications/community.
4. `pedidos.html` direct CSS stack.
5. `mensagens.html` desktop/mobile chat stack.
6. `perfil.html`, because it has the highest active CSS weight and the largest amount of `!important`.

## Non-negotiable cleanup rules

- Do not remove CSS by filename alone.
- Do not add a new `final`, `fix`, `parity`, `normalization`, `polish`, `rescue`, or `redesign` layer.
- Do not add `!important` to beat another contract.
- Do not change shell/header/rail/router without Playwright or equivalent manual validation.
- Every removal must prove either: no active selectors are used, or the responsibility has moved to a named authority file.
- The visual baseline must be preserved unless the change is explicitly approved as redesign.
