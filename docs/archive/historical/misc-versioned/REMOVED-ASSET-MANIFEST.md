# Removed unused asset candidates

These CSS/JS files were removed after the conservative unused-asset audit reported them as candidates and repository-wide text/reference search did not find active HTML, CSS import, JS dynamic-load, or active documentation references.

Runtime HTML/CSS/JS that is currently linked or imported was not removed.

## Removed files

- `assets/css/components/avatar-meta.css`
- `assets/css/components/cards/service-mini-card.css`
- `assets/css/components/floating-controls.css`
- `assets/css/components/layout/professional-responsive-polish-contract.css`
- `assets/css/components/meta/meta-list.css`
- `assets/css/components/navigation/social-page-transition.css`
- `assets/css/components/shell/header-rail-alignment-contract.css`
- `assets/css/components/shell/ipad-safari-scroll-rescue.css`
- `assets/css/components/shell/marketplace-page-contract.css`
- `assets/css/components/shell/tablet-app-parity.css`
- `assets/css/components/shell/tablet-shell-contract.css`
- `assets/css/pages/configuracoes/page-rebrand.css`
- `assets/css/pages/detalhe-anuncio-rail-parity.css`
- `assets/css/pages/detalhe-anuncio-responsive-contract.css`
- `assets/css/pages/detalhe-anuncio/detail-layout-contract.css`
- `assets/css/pages/detalhe-anuncio/mobile-rail-contract.css`
- `assets/css/pages/home-desktop-rail-parity.css`
- `assets/css/pages/home-tablet-v2.css`
- `assets/css/pages/home/tablet-final-authority.css`
- `assets/css/pages/mensagens/desktop-visual-repair.css`
- `assets/css/pages/mensagens/header-parity.css`
- `assets/css/pages/mensagens/product-layout-contract.css`
- `assets/css/pages/perfil-header-rail-parity.css`
- `assets/css/pages/perfil/mobile-owner-media-polish.css`
- `assets/css/pages/perfil/profile-adaptive-contract.css`
- `assets/css/pages/search-results-mobile-rail-final.css`
- `assets/css/patterns/ad-action-card.css`
- `assets/css/patterns/ad-gallery.css`
- `assets/css/patterns/ad-included-list.css`
- `assets/css/patterns/ad-mobile-cta.css`
- `assets/css/patterns/ad-process-steps.css`
- `assets/css/patterns/ad-publication-grid.css`
- `assets/css/patterns/ad-sidebar-cards.css`
- `assets/css/patterns/ad-summary-card.css`
- `assets/css/patterns/page-responsive-contract.css`
- `assets/css/patterns/worker-preview-modal.css`
- `assets/js/controllers/login-controller.js`
- `assets/js/core/category-icons.js`
- `assets/js/core/shell-first-paint-guard.js`
- `assets/js/pages/home/workers-hover-preview.js`
- `assets/js/pages/pedidos/orders-header.js`
- `assets/js/pages/perfil-base.js`
- `assets/js/ui/header-controls.js`

## Phase 29 — duplicate aliases removed

These files were exact duplicates of canonical assets and were removed to avoid parallel responsibility names:

- `assets/css/pages/notificacoes/pedidos-parity.css` -> `assets/css/pages/notificacoes/pedidos-notification-layout.css`
- `assets/css/pages/notificacoes/selection-parity.css` -> `assets/css/pages/notificacoes/selection-layout-contract.css`
- `assets/css/pages/mensagens/community-parity.css` -> `assets/css/pages/mensagens/community-layout-contract.css`
- `assets/css/pages/mensagens/desktop-redesign.css` -> `assets/css/pages/mensagens/page-visual-contract.css`
- `assets/css/pages/pedidos/mobile-longterm-normalization.css` -> `assets/css/pages/pedidos/mobile-layout-contract.css`
- `assets/css/pages/home-overlays/workers-feed-polish.css` -> `assets/css/pages/home-overlays/workers-feed-card-layout.css`
- `assets/css/pages/perfil-budget-modal/final-polish-success.css` -> `assets/css/pages/perfil-budget-modal/success-state-layout.css`
- `assets/css/pages/search-results/final-normalization.css` -> `assets/css/pages/search-results/results-layout-foundation.css`
- `assets/css/pages/search-results/final-parity.css` -> `assets/css/pages/search-results/results-page-alignment.css`
- `assets/css/pages/search-results/preview-parity.css` -> `assets/css/pages/search-results/preview-layout-contract.css`
- `assets/css/components/layout/marketplace-index-parity-contract.css` -> `assets/css/components/layout/marketplace-index-layout-contract.css`
- `assets/css/components/navigation/mobile-bottom-nav.css` -> `assets/css/components/navigation/mobile-bottom-nav-system.css`
