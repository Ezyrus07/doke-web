# Stage 61 — First Dormant CSS Candidate Batch Plan

## Objetivo
Separar o primeiro lote pequeno de CSS dormente para remoção controlada, sem deletar arquivo físico neste stage.

## Escopo
- Base usada: ZIP completo do Stage 60.
- Fonte primária: `docs/validation/runtime-hint-reconciliation-report.json`.
- Arquivos analisados: CSS não alcançável pela cascata ativa após reconciliação dos runtime hints.
- Remoção física: **nenhuma**.

## Resultado mensurável
- `not_reachable_css_files`: **134**
- `strong_docs_only_candidates`: **68**
- `strong_docs_only_candidates_with_important`: **20**
- `blocked_by_config`: **5**
- `blocked_by_script_or_tool`: **56**
- `blocked_by_css_text`: **2**
- `blocked_by_runtime`: **0**
- `needs_manual_review`: **3**
- `recommended_first_batch_size`: **12**
- `removal_performed`: **False**

## Critério de classificação
- **strong_candidate**: não alcançável por HTML/`@import`, sem referência em runtime/app/config/scripts; aparece apenas em documentação/relatórios.
- **blocked_config_contract**: citado por `config/`; precisa reconciliar contrato antes de remover.
- **blocked_script_or_tool_reference**: citado por scripts/tooling; precisa decidir se o script é histórico ou gate ativo antes de remover.
- **blocked_css_text_reference**: citado dentro de outro CSS, mesmo que em comentário; precisa revisão manual para evitar falso positivo.
- **blocked_runtime_reference**: citado por runtime/app; não deve ser removido.

## Contagem por classe
- `blocked_config_contract`: **5**
- `strong_candidate`: **68**
- `blocked_script_or_tool_reference`: **56**
- `blocked_css_text_reference`: **2**
- `needs_manual_review`: **3**

## Primeiro lote recomendado para Stage 62
Esses arquivos são **não alcançáveis**, têm `!important` dormente e aparecem apenas em documentação/relatórios. A recomendação é remover no Stage 62 em lote pequeno, validando antes e depois.

- `assets/css/components/shell/header-rail-alignment-contract.css`
- `assets/css/components/shell/tablet-shell-contract.css`
- `assets/css/components/cards/mobile-card-contract.css`
- `assets/css/components/navigation/home-mobile-drawer.css`
- `assets/css/components/shell/ipad-safari-scroll-rescue.css`
- `assets/css/components/shell/marketplace-page-contract.css`
- `assets/css/components/shell/tablet-app-parity.css`
- `assets/css/pages/app-shell-polish.css`
- `assets/css/pages/home/mobile-alignment.css`
- `assets/css/pages/perfil/tablet-portrait-contract.css`
- `assets/css/pages/search-results/mobile-card-contract.css`
- `assets/css/pages/home/mobile-composition.css`

## Candidatos fortes restantes, mas não no primeiro lote
Mantidos fora do primeiro lote para evitar remoção agressiva.

- `assets/css/pages/home/chrome.css`
- `assets/css/pages/home/footer.css`
- `assets/css/pages/home/mobile-feed-rails.css`
- `assets/css/pages/home/mobile-interactions.css`
- `assets/css/pages/home/mobile-layout.css`
- `assets/css/pages/search-results/mobile-density.css`
- `assets/css/pages/shell-normalize.css`
- `assets/css/patterns/community-room-layout.css`

## Candidatos fortes sem `!important`
Podem ser considerados depois que a limpeza de `!important` dormente estiver estabilizada.

- `assets/css/components/base/buttons.css`
- `assets/css/components/base/chips-badges.css`
- `assets/css/components/base/forms.css`
- `assets/css/components/base/index.css`
- `assets/css/components/base/modals.css`
- `assets/css/components/base/rating.css`
- `assets/css/components/cards/worker-media-card.css`
- `assets/css/components/internal/chat-workspace.css`
- `assets/css/components/internal/page-header.css`
- `assets/css/components/metrics.css`
- `assets/css/components/navigation/app-header.css`
- `assets/css/components/navigation/search-bar.css`
- `assets/css/components/navigation/social-page-transition.css`
- `assets/css/components/profile/profile-layout.css`
- `assets/css/core/layout/responsive-shell.css`
- `assets/css/pages/configuracoes/buttons.css`
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

## Bloqueados por `config/`
- `assets/css/components/avatar.css`
- `assets/css/components/buttons.css`
- `assets/css/components/tabs.css`
- `assets/css/components/toolbars.css`
- `assets/css/pages/perfil/mobile-public-profile.css`

## Bloqueados por scripts/tooling
- `assets/css/components/base/sections.css`
- `assets/css/components/before-after-workers-preview/workers-viewer-integrated.css`
- `assets/css/components/before-after-workers-preview/workers-viewer-stable-contract.css`
- `assets/css/components/cards/review-card.css`
- `assets/css/components/cards/service-card-actions.css`
- `assets/css/components/cards/shared-index-card-contract.css`
- `assets/css/components/domain/doke-domain-cards.css`
- `assets/css/components/layout/doke-layout-system.css`
- `assets/css/components/layout/index-compact-card-contract.css`
- `assets/css/components/layout/professional-responsive-layout.css`
- `assets/css/components/layout/responsive-page-contract.css`
- `assets/css/components/layout/responsive-priority-cards.css`
- `assets/css/components/layout/responsive-priority-contract.css`
- `assets/css/components/navigation/app-mobile-header-contract.css`
- `assets/css/components/navigation/app-mobile-search.css`
- `assets/css/components/navigation/app-mobile-topbar.css`
- `assets/css/components/navigation/mobile-bottom-nav-system.css`
- `assets/css/components/navigation/mobile-chrome-lock.css`
- `assets/css/components/navigation/mobile-internal-header.css`
- `assets/css/components/navigation/mobile-page-rhythm-contract.css`
- `assets/css/components/navigation/mobile-search-header-shared.css`
- `assets/css/components/profile/profile-reviews.css`
- `assets/css/components/shell/app-header-canonical-contract.css`
- `assets/css/components/shell/app-header.css`
- `assets/css/components/shell/desktop-base-stability.css`
- `assets/css/components/shell/desktop-search.css`
- `assets/css/components/shell/desktop-shell.css`
- `assets/css/components/shell/desktop-sidebar.css`
- `assets/css/components/shell/doke-shell-contract.css`
- `assets/css/components/shell/ipad-safari-scroll.css`
- `assets/css/components/shell/mobile-app-shell.css`
- `assets/css/components/shell/mobile-base-stability.css`
- `assets/css/components/shell/page-container-contract.css`
- `assets/css/components/shell/responsive-boundary.css`
- `assets/css/components/shell/tablet-internal-rail-contract.css`
- `assets/css/components/ui.css`
- `assets/css/core/border-consolidation.css`
- `assets/css/core/layout-responsive.css`
- `assets/css/core/layout-shell.css`
- `assets/css/core/layout-topbar.css`
- `assets/css/core/patterns.css`
- `assets/css/core/primitives.css`
- `assets/css/core/shell-home.css`
- `assets/css/core/surface-normalize.css`
- `assets/css/core/surfaces.css`
- `assets/css/pages/home-tablet-v2.css`
- `assets/css/pages/home/mobile-hero-feed.css`
- `assets/css/pages/home/mobile-index-feed-contract.css`
- `assets/css/pages/home/sections.css`
- `assets/css/pages/home/tablet-responsive-layout.css`
- `assets/css/pages/home/tablet-safari-layout.css`
- `assets/css/pages/results/index.css`
- `assets/css/pages/search-results/mobile-layout-contract.css`
- `assets/css/patterns/home-media-rails.css`
- `assets/css/patterns/marketplace-responsive-stack.css`
- `assets/css/patterns/mobile-app-shell.css`

## Bloqueados por referência em CSS
- `assets/css/components/internal/index.css`
- `assets/css/components/profile/index.css`

## Outros bloqueios/revisão manual
- `assets/css/pages/configuracoes/mobile-header-drawer.css` — `needs_manual_review`
- `assets/css/pages/home/tablet-shell-rail.css` — `needs_manual_review`
- `assets/css/patterns/page-responsive-contract.css` — `needs_manual_review`

## Validações executadas
- Links CSS quebrados em HTML ativo: **0**.
- Imports CSS quebrados: **0**.
- CSS com chaves desbalanceadas: **0**.
- `!important` alcançável pela cascata ativa: **0**.
- `npm run audit:css-import-map`: **passed**.
- `npm run audit:essential-asset-imports`: **passed-with-follow-up**.

## Decisão
Não remover arquivos neste stage. O Stage 62 deve remover apenas o lote recomendado, se os gates continuarem verdes imediatamente antes da remoção.

## Gates obrigatórios para Stage 62
- Links CSS quebrados em HTML ativo: 0.
- Imports CSS quebrados: 0.
- CSS com chaves desbalanceadas: 0.
- `!important` alcançável: 0.
- Referência runtime/app aos arquivos do lote: 0.
- Se algum arquivo do lote aparecer em `config/`, `scripts/`, HTML ativo, JS ativo ou CSS ativo, abortar remoção desse arquivo.

