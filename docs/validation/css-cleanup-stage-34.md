# CSS Cleanup Stage 34 — Active Home Cascade Priority Removal

## Objective
Remove the remaining `!important` declarations from the CSS files that are currently active in the `index.html` cascade. This is not a visual polish stage; it is a cascade simplification stage.

## Changed strategy
Instead of adding more page-level overrides, this stage removes priority from the files already participating in the home cascade so later visual work can be done through normal source order and component/pattern authority.

## Files touched by priority removal

- `assets/css/components/internal/list-page-toolbar.css` — removed 49 `!important` declarations
- `assets/css/components/cards/marketplace-card-contract.css` — removed 47 `!important` declarations
- `assets/css/pages/internal-shell.css` — removed 27 `!important` declarations
- `assets/css/components/cards/service-card.css` — removed 26 `!important` declarations
- `assets/css/components/ui-surface/overlay-root.css` — removed 26 `!important` declarations
- `assets/css/pages/search-results/worker-preview-layout-v34.css` — removed 24 `!important` declarations
- `assets/css/components/ui-surface/responsive.css` — removed 22 `!important` declarations
- `assets/css/components/ui-surface/surface-contract.css` — removed 20 `!important` declarations
- `assets/css/core/mobile/ui-standard.css` — removed 17 `!important` declarations
- `assets/css/pages/stable-desktop-rail.css` — removed 16 `!important` declarations
- `assets/css/components/layout/overflow-text-clipping-contract.css` — removed 15 `!important` declarations
- `assets/css/pages/search-results/results-density-preview-contract.css` — removed 11 `!important` declarations
- `assets/css/components/shell/internal-workspace.css` — removed 9 `!important` declarations
- `assets/css/core/layout/responsive-base.css` — removed 7 `!important` declarations
- `assets/css/core/base.css` — removed 4 `!important` declarations
- `assets/css/core/responsive-foundation.css` — removed 4 `!important` declarations
- `assets/css/core/ui/global-components.css` — removed 1 `!important` declarations

## Result

- Active `index.html` cascade `!important`: 325 -> 0
- Total `assets/css` `!important`: 16829
- CSS files with unbalanced brace counts: 0

## Risk
High visual risk in home, shared cards, search, overlays and internal toolbar. Accepted because the current phase prioritizes maintainable architecture over pixel preservation.

## Next target
Move from home-active cascade to high-risk internal pages: `perfil.html`, `mensagens.html`, `detalhe-anuncio.html` and `carteira.html`, starting with the biggest remaining page-specific files that still contain hundreds of priority declarations.
