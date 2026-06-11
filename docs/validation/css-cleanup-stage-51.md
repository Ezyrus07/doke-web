# CSS Cleanup Stage 51 — Flow Foundation consolidation

## Goal
Reduce repeated direct CSS links in simple internal/product-flow pages without deleting physical CSS files.

## New manifest
- `assets/css/pages/flow-foundation.css`

This manifest centralizes the common imports previously repeated in help/product-flow pages:
- core/index
- app-shell
- internal-shell
- layout/header
- doke-ui-system
- doke-product-flows
- help-drawer

## Pages updated
- `ajuda.html`
- `anunciar-servico.html`
- `novidades.html`
- `pagamento-profissional.html`
- `avaliacao-profissional.html`
- `tornar-profissional.html`

## Direct CSS link reduction
Each page went from 8 direct CSS links to 2 direct CSS links:
1. `assets/css/pages/flow-foundation.css`
2. page-specific CSS

## Structural rule
No CSS files were deleted in this stage. This is consolidation by manifest only.
