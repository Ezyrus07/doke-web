# Phase 4 — CSS load audit and safe reduction

## Mandatory page counts

| Page | Before | After | Reduction |
|---|---:|---:|---:|
| `index.html` | 23 | 17 | 6 |
| `perfil.html` | 61 | 55 | 6 |
| `pedidos.html` | 58 | 58 | 0 |
| `mensagens.html` | 60 | 60 | 0 |
| `notificacoes.html` | 51 | 51 | 0 |
| `comunidade.html` | 16 | 10 | 6 |
| `resultados.html` | 19 | 13 | 6 |
| `detalhe-anuncio.html` | 10 | 10 | 0 |
| `ajuda.html` | 26 | 26 | 0 |

## Safe consolidation applied

Created `assets/css/patterns/marketplace-responsive-stack.css` by concatenating seven adjacent responsive/marketplace pattern files in the same order. The original source files were not removed.

Consolidated source order:
- `assets/css/components/sections/section-header-canonical-contract.css`
- `assets/css/components/layout/overflow-text-clipping-contract.css`
- `assets/css/components/layout/professional-responsive-polish-contract.css`
- `assets/css/components/layout/responsive-priority-contract.css`
- `assets/css/components/layout/responsive-priority-cards.css`
- `assets/css/components/layout/index-compact-card-contract.css`
- `assets/css/components/cards/mobile-card-distribution-contract.css`

Updated pages: `index.html`, `perfil.html`, `comunidade.html`, `resultados.html`.

## Suspect CSS names still present by mandatory page


### `index.html` — 9 suspect links
- `assets/css/components/layout/responsive-page-contract.css?v=20260515-mobile-axis-v1`
- `assets/css/components/shell/doke-shell-contract.css?v=20260531-ipad-scroll-stability-v1`
- `assets/css/pages/home/mobile-feed-rails.css?v=20260519-mobile-feed-rail-fix-v1`
- `assets/css/components/shell/app-header-canonical-contract.css?v=20260525-header-canonical-v3`
- `assets/css/components/shell/shared-page-width-contract.css?v=20260531-large-mobile-contract-v33`
- `assets/css/pages/home/mobile-index-feed-contract.css?v=20260529-ad-rail-runtime-lock-v97`
- `assets/css/components/cards/marketplace-card-contract.css?v=20260531-card-contract-v4`
- `assets/css/pages/home/tablet-final-authority.css?v=20260601-sidebar-boundary-v1`
- `assets/css/components/shell/ipad-safari-scroll-rescue.css?v=20260601-index-tablet-v7-authority`

### `perfil.html` — 27 suspect links
- `assets/css/components/cards/card-grid-contract.css?v=20260502-stage2-card-contract-v1`
- `assets/css/components/forms-actions/form-action-contract.css?v=20260428-architecture`
- `assets/css/components/overlays/overlay-contract.css?v=20260428-architecture`
- `assets/css/patterns/responsive-polish.css?v=20260428-architecture`
- `assets/css/core/responsive-foundation.css?v=20260510-mobile-width-contract-v1`
- `assets/css/core/responsive-audit.css?v=20260429-no-bottomnav-avatar-final`
- `assets/css/components/avatar.css?v=20260429-avatar-circle-final`
- `assets/css/components/shell/page-container-contract.css?v=20260510-mobile-width-contract-v1`
- `assets/css/components/ui/doke-ui-system.css?v=20260501-ui-contract-v2-components`
- `assets/css/components/shell/desktop-shell.css?v=20260501-desktop-contract-v1`
- `assets/css/components/shell/desktop-sidebar.css?v=20260501-desktop-contract-v1`
- `assets/css/components/shell/desktop-topbar.css?v=20260501-desktop-contract-v1`
- `assets/css/components/shell/desktop-search.css?v=20260501-desktop-contract-v1`
- `assets/css/components/layout/responsive-page-contract.css?v=20260510-mobile-width-contract-v1`
- `assets/css/components/shell/doke-shell-contract.css?v=20260531-ipad-scroll-stability-v1`
- `assets/css/components/cards/ad-card.css?v=20260509-profile-index-card-parity`
- `assets/css/components/cards/service-card.css?v=20260503-canonical-card-contract-v3`
- `assets/css/pages/perfil-reference-hero.css?v=20260516-profile-rail-parity-v1`
- `assets/css/pages/perfil-header-rail-parity.css?v=20260524-tablet-profile-premium-v14`
- `assets/css/pages/perfil/mobile-owner-media-polish.css?v=20260519-owner-media-mobile-v1`
- `assets/css/pages/perfil-responsive-contract.css?v=20260524-profile-responsive-contract-v3`
- `assets/css/components/shell/app-header-canonical-contract.css?v=20260525-header-canonical-v3`
- `assets/css/components/shell/shared-page-width-contract.css?v=20260531-large-mobile-contract-v33`
- `assets/css/components/shell/desktop-page-rail-authority.css?v=20260526-tablet-header-top-parity-v12`
- `assets/css/components/shell/tablet-internal-rail-contract.css?v=20260526-tablet-internal-rail-contract-v1`
- `assets/css/components/cards/marketplace-card-contract.css?v=20260531-card-contract-v4`
- `assets/css/components/shell/ipad-safari-scroll-rescue.css?v=20260531-v5`

### `pedidos.html` — 36 suspect links
- `assets/css/pages/internal-shell.css?v=20260502-single-header-contract-v5`
- `assets/css/pages/internal-action-surfaces.css?v=20260502-single-header-contract-v5`
- `assets/css/core/responsive-foundation.css?v=20260510-mobile-width-contract-v1`
- `assets/css/components/cards/card-grid-contract.css?v=20260502-stage2-card-contract-v1`
- `assets/css/components/overlays/overlay-contract.css?v=20260428-architecture`
- `assets/css/components/forms-actions/form-action-contract.css?v=20260428-architecture`
- `assets/css/patterns/responsive-polish.css?v=20260428-architecture`
- `assets/css/components/shell/page-container-contract.css?v=20260510-mobile-width-contract-v1`
- `assets/css/pages/pedidos.css?v=20260429-mobile-edge-final`
- `assets/css/pages/pedidos/mobile-longterm-normalization.css?v=20260510-mobile-width-contract-v1`
- `assets/css/pages/pedidos/orders-details.css?v=20260506-orders-mobile-polish-v2`
- `assets/css/pages/pedidos/orders-chat.css?v=20260506-orders-mobile-polish-v2`
- `assets/css/components/avatar.css?v=20260429-avatar-circle-final`
- `assets/css/components/internal/action-panel-standard.css?v=20260506-filter-panel-polish-v4`
- `assets/css/components/overlays/mobile-action-surface-contract.css?v=20260430-action-surfaces-v1`
- `assets/css/components/ui/doke-ui-system.css?v=20260501-ui-contract-v2-components`
- `assets/css/components/domain/doke-domain-cards.css?v=20260503-canonical-service-card-v3-final`
- `assets/css/components/shell/desktop-shell.css?v=20260501-desktop-contract-v1`
- `assets/css/components/shell/desktop-sidebar.css?v=20260501-desktop-contract-v1`
- `assets/css/components/shell/desktop-topbar.css?v=20260501-desktop-contract-v1`
- `assets/css/components/shell/desktop-search.css?v=20260501-desktop-contract-v1`
- `assets/css/components/layout/responsive-page-contract.css?v=20260514-header-parity-audit-v2`
- `assets/css/components/shell/doke-shell-contract.css?v=20260531-ipad-scroll-stability-v1`
- `assets/css/pages/pedidos/orders-command-center.css?v=20260524-tablet-index-parity-v16`
- `assets/css/components/cards/marketplace-card-contract.css?v=20260525-global-card-contract-v1`
- `assets/css/components/shell/app-header-canonical-contract.css?v=20260525-header-canonical-v3`
- `assets/css/components/shell/shared-page-width-contract.css?v=20260531-large-mobile-contract-v33`
- `assets/css/components/sections/section-header-canonical-contract.css?v=20260525-section-header-compact-v2`
- `assets/css/components/layout/overflow-text-clipping-contract.css?v=20260525-overflow-text-clipping-contract-v1`
- `assets/css/components/layout/professional-responsive-polish-contract.css?v=20260525-professional-responsive-polish-v1`
- `assets/css/components/layout/responsive-priority-contract.css?v=20260525-p1-objective-v1`
- `assets/css/components/layout/index-compact-card-contract.css?v=20260525-index-compact-card-contract-v2`
- `assets/css/components/cards/mobile-card-distribution-contract.css?v=20260525-mobile-card-distribution-v1`
- `assets/css/components/shell/desktop-page-rail-authority.css?v=20260526-tablet-header-top-parity-v12`
- `assets/css/components/shell/tablet-internal-rail-contract.css?v=20260526-tablet-internal-rail-contract-v1`
- `assets/css/components/shell/ipad-safari-scroll-rescue.css?v=20260531-v5`

### `mensagens.html` — 34 suspect links
- `assets/css/pages/internal-shell.css?v=20260502-single-header-contract-v5`
- `assets/css/pages/internal-list-pages.css?v=20260502-single-header-contract-v5`
- `assets/css/pages/internal-action-surfaces.css?v=20260502-single-header-contract-v5`
- `assets/css/core/responsive-foundation.css?v=20260510-mobile-width-contract-v1`
- `assets/css/components/cards/card-grid-contract.css?v=20260428-architecture`
- `assets/css/components/overlays/overlay-contract.css?v=20260428-architecture`
- `assets/css/components/forms-actions/form-action-contract.css?v=20260428-architecture`
- `assets/css/patterns/responsive-polish.css?v=20260428-architecture`
- `assets/css/components/avatar.css?v=20260429-avatar-circle-final`
- `assets/css/components/shell/page-container-contract.css?v=20260510-mobile-width-contract-v1`
- `assets/css/components/ui/doke-ui-system.css?v=20260501-ui-contract-v2-components`
- `assets/css/components/domain/doke-domain-cards.css?v=20260503-canonical-service-card-v3-final`
- `assets/css/components/shell/desktop-shell.css?v=20260501-desktop-contract-v1`
- `assets/css/components/shell/desktop-sidebar.css?v=20260501-desktop-contract-v1`
- `assets/css/components/shell/desktop-topbar.css?v=20260501-desktop-contract-v1`
- `assets/css/components/shell/desktop-search.css?v=20260501-desktop-contract-v1`
- `assets/css/components/internal/chat-workspace-contract.css?v=20260530-sidebar-global-parity-v1`
- `assets/css/components/layout/responsive-page-contract.css?v=20260514-header-parity-audit-v2`
- `assets/css/components/shell/doke-shell-contract.css?v=20260531-ipad-scroll-stability-v1`
- `assets/css/components/cards/marketplace-card-contract.css?v=20260525-global-card-contract-v1`
- `assets/css/components/shell/app-header-canonical-contract.css?v=20260525-header-canonical-v3`
- `assets/css/components/shell/shared-page-width-contract.css?v=20260531-large-mobile-contract-v33`
- `assets/css/components/sections/section-header-canonical-contract.css?v=20260525-section-header-compact-v2`
- `assets/css/components/layout/overflow-text-clipping-contract.css?v=20260525-overflow-text-clipping-contract-v1`
- `assets/css/components/layout/professional-responsive-polish-contract.css?v=20260525-professional-responsive-polish-v1`
- `assets/css/components/layout/responsive-priority-contract.css?v=20260525-p1-objective-v1`
- `assets/css/components/layout/index-compact-card-contract.css?v=20260525-index-compact-card-contract-v2`
- `assets/css/components/cards/mobile-card-distribution-contract.css?v=20260525-mobile-card-distribution-v1`
- `assets/css/components/shell/desktop-page-rail-authority.css?v=20260526-tablet-header-top-parity-v12`
- `assets/css/components/shell/tablet-internal-rail-contract.css?v=20260530-internal-header-global-parity-v12`
- `assets/css/pages/mensagens.css?v=20260529-messages-contract-clean-v2`
- `assets/css/pages/mensagens/desktop-layout-contract.css?v=20260529-audio-grid-state-v15`
- `assets/css/pages/mensagens/tablet-portrait-thread-contract.css?v=20260530-messages-content-only-v12`
- `assets/css/components/shell/ipad-safari-scroll-rescue.css?v=20260531-v5`

### `notificacoes.html` — 32 suspect links
- `assets/css/pages/internal-shell.css?v=20260502-single-header-contract-v5`
- `assets/css/pages/internal-list-pages.css?v=20260502-single-header-contract-v5`
- `assets/css/pages/internal-action-surfaces.css?v=20260502-single-header-contract-v5`
- `assets/css/pages/notificacoes.css?v=20260522-notifications-header-actions-final-v76`
- `assets/css/core/responsive-foundation.css?v=20260510-mobile-width-contract-v1`
- `assets/css/components/cards/card-grid-contract.css?v=20260502-stage2-card-contract-v1`
- `assets/css/components/overlays/overlay-contract.css?v=20260428-architecture`
- `assets/css/components/forms-actions/form-action-contract.css?v=20260428-architecture`
- `assets/css/patterns/responsive-polish.css?v=20260428-architecture`
- `assets/css/components/avatar.css?v=20260429-avatar-circle-final`
- `assets/css/components/shell/page-container-contract.css?v=20260510-mobile-width-contract-v1`
- `assets/css/components/overlays/mobile-action-surface-contract.css?v=20260430-action-surfaces-v1`
- `assets/css/components/ui/doke-ui-system.css?v=20260501-ui-contract-v2-components`
- `assets/css/components/domain/doke-domain-cards.css?v=20260503-canonical-service-card-v3-final`
- `assets/css/components/shell/desktop-shell.css?v=20260501-desktop-contract-v1`
- `assets/css/components/shell/desktop-sidebar.css?v=20260501-desktop-contract-v1`
- `assets/css/components/shell/desktop-topbar.css?v=20260501-desktop-contract-v1`
- `assets/css/components/shell/desktop-search.css?v=20260501-desktop-contract-v1`
- `assets/css/components/layout/responsive-page-contract.css?v=20260510-mobile-width-contract-v1`
- `assets/css/components/shell/doke-shell-contract.css?v=20260531-ipad-scroll-stability-v1`
- `assets/css/components/cards/marketplace-card-contract.css?v=20260525-global-card-contract-v1`
- `assets/css/components/shell/app-header-canonical-contract.css?v=20260525-header-canonical-v3`
- `assets/css/components/shell/shared-page-width-contract.css?v=20260531-large-mobile-contract-v33`
- `assets/css/components/sections/section-header-canonical-contract.css?v=20260525-section-header-compact-v2`
- `assets/css/components/layout/overflow-text-clipping-contract.css?v=20260525-overflow-text-clipping-contract-v1`
- `assets/css/components/layout/professional-responsive-polish-contract.css?v=20260525-professional-responsive-polish-v1`
- `assets/css/components/layout/responsive-priority-contract.css?v=20260525-p1-objective-v1`
- `assets/css/components/layout/index-compact-card-contract.css?v=20260525-index-compact-card-contract-v2`
- `assets/css/components/cards/mobile-card-distribution-contract.css?v=20260525-mobile-card-distribution-v1`
- `assets/css/components/shell/desktop-page-rail-authority.css?v=20260526-tablet-header-top-parity-v12`
- `assets/css/components/shell/tablet-internal-rail-contract.css?v=20260526-tablet-internal-rail-contract-v1`
- `assets/css/components/shell/ipad-safari-scroll-rescue.css?v=20260531-v5`

### `comunidade.html` — 8 suspect links
- `assets/css/components/layout/responsive-page-contract.css?v=20260514-header-parity-audit-v2`
- `assets/css/components/shell/doke-shell-contract.css?v=20260531-ipad-scroll-stability-v1`
- `assets/css/components/shell/app-header-canonical-contract.css?v=20260525-header-canonical-v3`
- `assets/css/components/shell/shared-page-width-contract.css?v=20260531-large-mobile-contract-v33`
- `assets/css/components/shell/desktop-page-rail-authority.css?v=20260526-tablet-header-top-parity-v12`
- `assets/css/components/shell/tablet-internal-rail-contract.css?v=20260526-tablet-internal-rail-contract-v1`
- `assets/css/components/cards/marketplace-card-contract.css?v=20260531-card-contract-v4`
- `assets/css/components/shell/ipad-safari-scroll-rescue.css?v=20260531-v5`

### `resultados.html` — 9 suspect links
- `assets/css/components/shell/app-header.css?v=20260527-results-header-parity-v1`
- `assets/css/components/layout/responsive-page-contract.css?v=20260514-header-parity-audit-v2`
- `assets/css/components/shell/doke-shell-contract.css?v=20260531-ipad-scroll-stability-v1`
- `assets/css/components/shell/app-header-canonical-contract.css?v=20260601-header-canonical-phase2-v1`
- `assets/css/components/shell/shared-page-width-contract.css?v=20260531-large-mobile-contract-v33`
- `assets/css/components/shell/desktop-page-rail-authority.css?v=20260526-tablet-header-top-parity-v12`
- `assets/css/components/shell/tablet-internal-rail-contract.css?v=20260526-tablet-internal-rail-contract-v1`
- `assets/css/components/cards/marketplace-card-contract.css?v=20260531-card-contract-v4`
- `assets/css/components/shell/ipad-safari-scroll-rescue.css?v=20260531-v5`

### `detalhe-anuncio.html` — 10 suspect links
- `assets/css/components/shell/app-header-canonical-contract.css?v=20260525-header-canonical-v3`
- `assets/css/components/shell/shared-page-width-contract.css?v=20260531-large-mobile-contract-v33`
- `assets/css/components/sections/section-header-canonical-contract.css?v=20260525-section-header-compact-v2`
- `assets/css/components/layout/overflow-text-clipping-contract.css?v=20260525-overflow-text-clipping-contract-v1`
- `assets/css/components/layout/professional-responsive-polish-contract.css?v=20260525-professional-responsive-polish-v1`
- `assets/css/components/cards/mobile-card-distribution-contract.css?v=20260525-mobile-card-distribution-v1`
- `assets/css/components/shell/desktop-page-rail-authority.css?v=20260526-tablet-header-top-parity-v12`
- `assets/css/components/shell/tablet-internal-rail-contract.css?v=20260526-tablet-internal-rail-contract-v1`
- `assets/css/components/cards/marketplace-card-contract.css?v=20260531-card-contract-v4`
- `assets/css/components/shell/ipad-safari-scroll-rescue.css?v=20260531-v5`

### `ajuda.html` — 15 suspect links
- `assets/css/pages/internal-shell.css?v=20260502-single-header-contract-v5`
- `assets/css/components/shell/doke-shell-contract.css?v=20260531-ipad-scroll-stability-v1`
- `assets/css/components/shell/app-header-canonical-contract.css?v=20260601-header-canonical-phase2-v1`
- `assets/css/components/layout/responsive-page-contract.css?v=20260510-mobile-width-contract-v1`
- `assets/css/components/ui/doke-ui-system.css?v=20260501-ui-contract-v2-components`
- `assets/css/components/domain/doke-domain-cards.css?v=20260503-canonical-service-card-v3-final`
- `assets/css/components/shell/desktop-shell.css?v=20260501-desktop-contract-v1`
- `assets/css/components/shell/desktop-sidebar.css?v=20260501-desktop-contract-v1`
- `assets/css/components/shell/desktop-topbar.css?v=20260501-desktop-contract-v1`
- `assets/css/components/shell/desktop-search.css?v=20260501-desktop-contract-v1`
- `assets/css/components/shell/shared-page-width-contract.css?v=20260525-rails-container-contract-v1`
- `assets/css/components/layout/index-compact-card-contract.css?v=20260525-index-compact-card-contract-v2`
- `assets/css/components/shell/desktop-page-rail-authority.css?v=20260526-tablet-header-top-parity-v12`
- `assets/css/components/shell/tablet-internal-rail-contract.css?v=20260526-tablet-internal-rail-contract-v1`
- `assets/css/components/shell/ipad-safari-scroll-rescue.css?v=20260531-v5`

## Notes

- No CSS source file was deleted.
- No HTML outside the four safe-consolidation pages was changed.
- This phase intentionally avoids removing behavior-only or potentially active CSS until Playwright visual/structural validation is available.
- Bundle contains no `url()` or `@import`, so relative asset paths were not affected.
