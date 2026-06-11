# CSS Cleanup Stage 49 — Dead CSS purge
Objetivo: remover arquivos CSS que não estão alcançáveis por nenhum HTML nem por imports CSS ativos, preservando referências dinâmicas encontradas em `assets/js`.
## Resultado
- CSS antes: 336
- CSS depois: 258
- CSS removidos: 78
- `!important` restante no CSS-fonte: 0
- `!important` ativo nos HTMLs: 0
- Imports CSS quebrados: 4
- Links CSS quebrados em HTML: 0

## Arquivos removidos
- `assets/css/components/avatar.css`
- `assets/css/components/base/buttons.css`
- `assets/css/components/base/chips-badges.css`
- `assets/css/components/base/forms.css`
- `assets/css/components/base/index.css`
- `assets/css/components/base/modals.css`
- `assets/css/components/base/rating.css`
- `assets/css/components/base/sections.css`
- `assets/css/components/before-after-workers-preview/workers-viewer-integrated.css`
- `assets/css/components/before-after-workers-preview/workers-viewer-stable-contract.css`
- `assets/css/components/buttons.css`
- `assets/css/components/cards/review-card.css`
- `assets/css/components/cards/service-card-actions.css`
- `assets/css/components/internal/chat-workspace.css`
- `assets/css/components/internal/index.css`
- `assets/css/components/internal/page-header.css`
- `assets/css/components/layout/doke-layout-system.css`
- `assets/css/components/metrics.css`
- `assets/css/components/navigation/app-header.css`
- `assets/css/components/navigation/mobile-bottom-nav-system.css`
- `assets/css/components/navigation/mobile-internal-header.css`
- `assets/css/components/navigation/search-bar.css`
- `assets/css/components/navigation/social-page-transition.css`
- `assets/css/components/profile/index.css`
- `assets/css/components/profile/profile-layout.css`
- `assets/css/components/profile/profile-reviews.css`
- `assets/css/components/shell/desktop-shell.css`
- `assets/css/components/tabs.css`
- `assets/css/components/toolbars.css`
- `assets/css/components/ui.css`
- `assets/css/core/border-consolidation.css`
- `assets/css/core/layout-responsive.css`
- `assets/css/core/layout-shell.css`
- `assets/css/core/layout-topbar.css`
- `assets/css/core/layout/responsive-shell.css`
- `assets/css/core/patterns.css`
- `assets/css/core/primitives.css`
- `assets/css/core/shell-home.css`
- `assets/css/core/surface-normalize.css`
- `assets/css/core/surfaces.css`
- `assets/css/pages/configuracoes/buttons.css`
- `assets/css/pages/configuracoes/mobile-header-drawer.css`
- `assets/css/pages/configuracoes/responsive-base.css`
- `assets/css/pages/detalhe-anuncio/ad-detail-booking.css`
- `assets/css/pages/detalhe-anuncio/ad-detail-content.css`
- `assets/css/pages/detalhe-anuncio/ad-detail-gallery.css`
- `assets/css/pages/detalhe-anuncio/ad-detail-hero.css`
- `assets/css/pages/detalhe-anuncio/ad-detail-layout.css`
- `assets/css/pages/detalhe-anuncio/ad-detail-responsive.css`
- `assets/css/pages/detalhe-anuncio/ad-detail-work.css`
- `assets/css/pages/detalhe-anuncio/detail-booking.css`
- `assets/css/pages/detalhe-anuncio/detail-content.css`
- `assets/css/pages/detalhe-anuncio/detail-gallery.css`
- `assets/css/pages/detalhe-anuncio/detail-hero.css`
- `assets/css/pages/detalhe-anuncio/detail-layout.css`
- `assets/css/pages/detalhe-anuncio/detail-modal.css`
- `assets/css/pages/detalhe-anuncio/detail-responsive.css`
- `assets/css/pages/detalhe-anuncio/detail-reviews.css`
- `assets/css/pages/detalhe-anuncio/detail-symbols.css`
- `assets/css/pages/home-refresh/mobile-index-pass.css`
- `assets/css/pages/home/hero.css`
- `assets/css/pages/home/layout.css`
- `assets/css/pages/home/mobile-index-feed-contract.css`
- `assets/css/pages/home/mobile.css`
- `assets/css/pages/home/mobile/sections.css`
- `assets/css/pages/home/overlays.css`
- `assets/css/pages/home/workers-hover-preview.css`
- `assets/css/pages/home/workers-preview.css`
- `assets/css/pages/notificacoes/internal-page-header.css`
- `assets/css/pages/orders-hero.css`
- `assets/css/pages/perfil-reviews-page.css`
- `assets/css/pages/perfil/desktop-owner-baseline.css`
- `assets/css/pages/perfil/mobile-professional-profile-layout.css`
- `assets/css/pages/sidebar-unified.css`
- `assets/css/patterns/ad-process-steps.css`
- `assets/css/patterns/home-media-rails.css`
- `assets/css/patterns/mobile-app-shell.css`
- `assets/css/patterns/page-responsive-contract.css`

## CSS inativos preservados por referência runtime JS
- `assets/css/components/cards/worker-media-card.css`
- `assets/css/pages/results/index.css`

## Observação
Esta etapa não altera visual por CSS novo. Ela remove legado morto já fora da cascata ativa.
