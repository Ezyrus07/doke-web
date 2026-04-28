# Etapa 12 — Inventário de CSS legado e mapa de limpeza

Esta etapa não muda visual, HTML ou comportamento. Ela cria uma base objetiva para limpar CSS sem apagar arquivo errado e sem repetir o problema do Stage 10.

## Números atuais

- HTMLs analisados: 19
- Arquivos CSS encontrados: 250
- CSS alcançável por HTML ou @import: 197
- Candidatos inativos: 53
- Arquivos ativos com nome de legado/fix/pass/rescue: 26
- Arquivos ativos de maior risco para auditoria manual: 44

## Contratos oficiais das etapas 1–11

| Arquivo | Existe | Alcançável |
|---|---:|---:|
| assets/css/core/responsive-foundation.css | sim | sim |
| assets/css/components/internal/topbar-standard.css | sim | sim |
| assets/css/components/cards/card-grid-contract.css | sim | sim |
| assets/css/patterns/home-results-card-stage4.css | sim | sim |
| assets/css/pages/perfil/mobile-stage5.css | sim | sim |
| assets/css/patterns/internal-pages-stage6.css | sim | sim |
| assets/css/pages/comunidade/mobile-stage7.css | sim | sim |
| assets/css/patterns/remaining-pages-stage8.css | sim | sim |
| assets/css/components/overlays/overlay-contract-stage9.css | sim | sim |
| assets/css/components/forms-actions/form-action-contract-stage10.css | sim | sim |
| assets/css/core/responsive-runtime-stage11.css | sim | sim |

## Distribuição por responsabilidade

| Camada | Total | Ativos | Inativos | Ativos com nome legado |
|---|---:|---:|---:|---:|
| components | 54 | 47 | 7 | 3 |
| core | 25 | 16 | 9 | 0 |
| pages | 168 | 131 | 37 | 23 |
| patterns | 3 | 3 | 0 | 0 |

## Regra operacional para a próxima limpeza

1. Não apagar arquivo apenas porque está inativo no inventário; primeiro confirmar se ele não é usado por testes, protótipos ou HTMLs fora da raiz.
2. Não criar novos arquivos com nomes como final, fix, rescue, pass, polish ou cleanup.
3. Qualquer ajuste visual novo deve entrar em core, components, patterns ou pages conforme responsabilidade.
4. Contrato global só pode afetar desktop quando houver escopo explícito; ajustes de mobile precisam ficar em media query mobile.
5. Arquivos de página não devem redefinir botão, input, modal, card ou topbar global.

## Candidatos inativos — não apagar ainda

- assets/css/components/index.css
- assets/css/components/internal/action-surfaces.css
- assets/css/components/internal/index.css
- assets/css/components/profile/index.css
- assets/css/components/profile/profile-layout.css
- assets/css/components/surface-contract-final.css
- assets/css/components/ui.css
- assets/css/core/border-consolidation.css
- assets/css/core/layout-responsive.css
- assets/css/core/layout-shell.css
- assets/css/core/layout-topbar.css
- assets/css/core/patterns.css
- assets/css/core/primitives.css
- assets/css/core/shell-home.css
- assets/css/core/surface-normalize.css
- assets/css/core/surfaces.css
- assets/css/pages/app-shell-polish.css
- assets/css/pages/desktop-cleanup.css
- assets/css/pages/home/chrome.css
- assets/css/pages/home/footer.css
- assets/css/pages/home/hero.css
- assets/css/pages/home/index.css
- assets/css/pages/home/layout.css
- assets/css/pages/home/mobile.css
- assets/css/pages/home/mobile/base.css
- assets/css/pages/home/mobile/categories.css
- assets/css/pages/home/mobile/drawer.css
- assets/css/pages/home/mobile/featured.css
- assets/css/pages/home/mobile/index.css
- assets/css/pages/home/mobile/search.css
- assets/css/pages/home/mobile/sections.css
- assets/css/pages/home/mobile/topbar.css
- assets/css/pages/home/overlays.css
- assets/css/pages/home/sections.css
- assets/css/pages/home/workers-hover-preview.css
- assets/css/pages/home/workers-preview.css
- assets/css/pages/index.css
- assets/css/pages/notificacoes/selection-cleanup.css
- assets/css/pages/orders-hero.css
- assets/css/pages/pedidos/selection-cleanup.css
- assets/css/pages/perfil-budget-modal/visual-deck-fix.css
- assets/css/pages/perfil/profile-trim.css
- assets/css/pages/profile-reviews.css
- assets/css/pages/resultados.css
- assets/css/pages/results/index.css
- assets/css/pages/results/results-density-polish.css
- assets/css/pages/results/results-grid-polish.css
- assets/css/pages/search-results/layout-density-contract.css
- assets/css/pages/search-results/structure-contract-v2.css
- assets/css/pages/selection/selection-cleanup.css
- assets/css/pages/shell-normalize.css
- assets/css/pages/sidebar-unified.css
- assets/css/pages/ui-kit.css

## Arquivos ativos com nome legado

- assets/css/components/before-after-workers-preview/before-after-comments-v5.css
- assets/css/components/before-after-workers-preview/shared-publication-polish.css
- assets/css/components/cards/service-card-actions-fix.css
- assets/css/pages/comunidade-interna/compact-final-adjustments.css
- assets/css/pages/comunidade-interna/final-room-layout.css
- assets/css/pages/comunidade-interna/full-bleed-fix.css
- assets/css/pages/comunidade-interna/internal-modal-legacy.css
- assets/css/pages/comunidade-interna/mobile-rescue.css
- assets/css/pages/comunidade/compact-cards-v4.css
- assets/css/pages/comunidade/discovery-v2.css
- assets/css/pages/comunidade/discovery-v3-refinement.css
- assets/css/pages/comunidade/internal-modal-legacy.css
- assets/css/pages/comunidade/mobile-rescue.css
- assets/css/pages/configuracoes/final-responsive-pass.css
- assets/css/pages/home-refresh/mobile-index-pass.css
- assets/css/pages/mensagens/final-standardization.css
- assets/css/pages/mensagens/responsive-pass.css
- assets/css/pages/notificacoes/responsive-pass.css
- assets/css/pages/notificacoes/selection-state-fix.css
- assets/css/pages/perfil-budget-modal/final-polish-success.css
- assets/css/pages/search-results/final-normalization.css
- assets/css/pages/search-results/final-parity.css
- assets/css/pages/search-results/mobile-polish.css
- assets/css/pages/search-results/responsive-pass.css
- assets/css/pages/search-results/worker-preview-layout-v34.css
- assets/css/pages/search-results/workers-desktop-fix.css

## Arquivos ativos de maior risco para auditoria manual

- assets/css/pages/home-sections.css — 3198 linhas, 413 linhas sensíveis, 0 seletores amplos
- assets/css/pages/pedidos.css — 2688 linhas, 311 linhas sensíveis, 0 seletores amplos
- assets/css/pages/home-search-chrome.css — 1581 linhas, 270 linhas sensíveis, 1 seletores amplos
- assets/css/core/ui/global-components.css — 989 linhas, 167 linhas sensíveis, 13 seletores amplos
- assets/css/core/layout/responsive-shell.css — 1107 linhas, 157 linhas sensíveis, 0 seletores amplos
- assets/css/core/layout/topbar.css — 906 linhas, 139 linhas sensíveis, 0 seletores amplos
- assets/css/components/ui-surface/modal-alignment.css — 553 linhas, 138 linhas sensíveis, 0 seletores amplos
- assets/css/pages/comunidade-interna/base.css — 1042 linhas, 133 linhas sensíveis, 0 seletores amplos
- assets/css/pages/comunidade/base-and-discovery.css — 1041 linhas, 133 linhas sensíveis, 0 seletores amplos
- assets/css/components/overlays/overlay-contract-stage9.css — 455 linhas, 121 linhas sensíveis, 0 seletores amplos
- assets/css/pages/carteira.css — 1623 linhas, 119 linhas sensíveis, 0 seletores amplos
- assets/css/pages/home-refresh/mobile-index-pass.css — 1290 linhas, 119 linhas sensíveis, 0 seletores amplos
- assets/css/components/cards/service-card.css — 583 linhas, 116 linhas sensíveis, 0 seletores amplos
- assets/css/components/forms-actions/form-action-contract-stage10.css — 252 linhas, 98 linhas sensíveis, 6 seletores amplos
- assets/css/core/mobile/ui-standard.css — 247 linhas, 105 linhas sensíveis, 3 seletores amplos
- assets/css/core/layout/responsive-base.css — 688 linhas, 111 linhas sensíveis, 0 seletores amplos
- assets/css/pages/perfil-budget-modal/quote-flow-refinement.css — 542 linhas, 106 linhas sensíveis, 0 seletores amplos
- assets/css/pages/orcamento.css — 920 linhas, 105 linhas sensíveis, 0 seletores amplos
- assets/css/pages/home-tablet.css — 536 linhas, 97 linhas sensíveis, 0 seletores amplos
- assets/css/pages/notificacoes/base-layout.css — 735 linhas, 94 linhas sensíveis, 0 seletores amplos
- assets/css/pages/internal-shell.css — 304 linhas, 93 linhas sensíveis, 0 seletores amplos
- assets/css/core/ui/patterns.css — 323 linhas, 88 linhas sensíveis, 1 seletores amplos
- assets/css/components/shell/app-shell.css — 822 linhas, 89 linhas sensíveis, 0 seletores amplos
- assets/css/pages/home-refresh/mobile-cards.css — 602 linhas, 89 linhas sensíveis, 0 seletores amplos
- assets/css/pages/comunidade/discovery-v2.css — 727 linhas, 85 linhas sensíveis, 0 seletores amplos
- assets/css/pages/search-results/base-layout.css — 479 linhas, 85 linhas sensíveis, 0 seletores amplos
- assets/css/pages/perfil.css — 1341 linhas, 84 linhas sensíveis, 0 seletores amplos
- assets/css/pages/home-overlays/location-address.css — 418 linhas, 73 linhas sensíveis, 2 seletores amplos
- assets/css/components/cards/mobile-card-contract.css — 257 linhas, 78 linhas sensíveis, 0 seletores amplos
- assets/css/pages/configuracoes/mobile-header-drawer.css — 555 linhas, 72 linhas sensíveis, 2 seletores amplos

## Próximo passo seguro

A Etapa 13 deve validar visualmente os breakpoints principais e só depois arquivar/remover os candidatos confirmados. A limpeza física deve ser incremental, em pequenos lotes, com rollback simples.
