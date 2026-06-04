# Duplicate asset hygiene — Phase 29

This phase removes exact duplicate CSS files that were no longer the canonical source of truth. The removed files had identical contents to their replacement files after line-ending normalization, but carried legacy names such as `parity`, `final`, `polish`, `normalization`, or `redesign`.

## Rule

Do not keep two identical CSS/JS assets active or available under different responsibility names. Keep the canonical responsibility name and remove the historical alias.

## Removed aliases

| Removed alias | Canonical file kept |
| --- | --- |
| `assets/css/pages/notificacoes/pedidos-parity.css` | `assets/css/pages/notificacoes/pedidos-notification-layout.css` |
| `assets/css/pages/notificacoes/selection-parity.css` | `assets/css/pages/notificacoes/selection-layout-contract.css` |
| `assets/css/pages/mensagens/community-parity.css` | `assets/css/pages/mensagens/community-layout-contract.css` |
| `assets/css/pages/mensagens/desktop-redesign.css` | `assets/css/pages/mensagens/page-visual-contract.css` |
| `assets/css/pages/pedidos/mobile-longterm-normalization.css` | `assets/css/pages/pedidos/mobile-layout-contract.css` |
| `assets/css/pages/home-overlays/workers-feed-polish.css` | `assets/css/pages/home-overlays/workers-feed-card-layout.css` |
| `assets/css/pages/perfil-budget-modal/final-polish-success.css` | `assets/css/pages/perfil-budget-modal/success-state-layout.css` |
| `assets/css/pages/search-results/final-normalization.css` | `assets/css/pages/search-results/results-layout-foundation.css` |
| `assets/css/pages/search-results/final-parity.css` | `assets/css/pages/search-results/results-page-alignment.css` |
| `assets/css/pages/search-results/preview-parity.css` | `assets/css/pages/search-results/preview-layout-contract.css` |
| `assets/css/components/layout/marketplace-index-parity-contract.css` | `assets/css/components/layout/marketplace-index-layout-contract.css` |
| `assets/css/components/navigation/mobile-bottom-nav.css` | `assets/css/components/navigation/mobile-bottom-nav-system.css` |

## Audit added

`npm run audit:duplicate-assets` now writes an informational report to `reports/generated/duplicate-assets-summary.json`.

The audit is intentionally non-blocking. Duplicate assets should be reviewed and removed only when the canonical responsibility file is clear.
