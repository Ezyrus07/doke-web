# Global Cycle 4 — Inventário de CSS/JS por HTML

Este relatório mapeia imports por página antes de qualquer remoção de CSS antigo. Ele é diagnóstico: não muda visual e não decide remoção automática.

## Resumo

- HTMLs auditados: **21**
- CSS únicos carregados por HTML: **281**
- JS únicos carregados por HTML: **88**
- Imports internos quebrados encontrados: **0**
- Ocorrências de `style=""` em HTMLs: **11**
- Soma de `!important` nos CSS carregados pelas páginas: **80926**

## Severidade por página

| HTML | Severidade | CSS | JS | !important carregado | Inline style | Observação |
|---|---:|---:|---:|---:|---:|---|
| `index.html` | Crítica | 134 | 43 | 14528 | 0 | superfície crítica; 14 CSS suspeito(s) |
| `resultados.html` | Crítica | 116 | 36 | 7295 | 0 | superfície crítica; em evolução; 18 CSS suspeito(s) |
| `perfil.html` | Crítica | 105 | 38 | 11692 | 1 | superfície crítica; 11 CSS suspeito(s) |
| `comunidade-interna.html` | Crítica | 100 | 31 | 8177 | 0 | superfície crítica; em evolução; 14 CSS suspeito(s) |
| `comunidade.html` | Crítica | 87 | 32 | 3684 | 0 | 11 CSS suspeito(s) |
| `notificacoes.html` | Crítica | 85 | 32 | 4027 | 0 | 12 CSS suspeito(s) |
| `pedidos.html` | Crítica | 80 | 45 | 4226 | 3 | superfície crítica; 9 CSS suspeito(s) |
| `configuracoes.html` | Crítica | 78 | 33 | 3654 | 0 | em evolução; 9 CSS suspeito(s) |
| `mensagens.html` | Crítica | 77 | 33 | 7244 | 0 | superfície crítica; 10 CSS suspeito(s) |
| `carteira.html` | Crítica | 70 | 31 | 3690 | 3 | em evolução; 8 CSS suspeito(s) |
| `avaliacao.html` | Crítica | 59 | 4 | 2894 | 0 | em evolução; 8 CSS suspeito(s) |
| `finalizar-pedido.html` | Crítica | 59 | 4 | 2894 | 0 | em evolução; 8 CSS suspeito(s) |
| `pagamento.html` | Crítica | 59 | 4 | 2894 | 0 | em evolução; 8 CSS suspeito(s) |
| `adicionar-cartao.html` | Crítica | 51 | 4 | 1770 | 0 | em evolução; 4 CSS suspeito(s) |
| `detalhe-anuncio.html` | Alta | 27 | 3 | 948 | 0 | em evolução |
| `docs/ui-kit.html` | Alta | 24 | 0 | 940 | 4 | — |
| `auth/cadastro.html` | Média | 12 | 4 | 123 | 0 | 1 CSS suspeito(s) |
| `auth/esqueci-senha.html` | Média | 12 | 4 | 123 | 0 | 1 CSS suspeito(s) |
| `auth/login.html` | Média | 12 | 4 | 123 | 0 | 1 CSS suspeito(s) |
| `teste.html` | Baixa | 0 | 0 | 0 | 0 | — |
| `tools/responsive-stage13-dashboard.html` | Baixa | 0 | 0 | 0 | 0 | — |

## CSS mais compartilhados

| CSS | Páginas | !important | Tamanho |
|---|---:|---:|---:|
| `assets/css/core/base.css` | 19 | 4 | 4.3 KB |
| `assets/css/core/tokens.css` | 19 | 0 | 10.5 KB |
| `assets/css/components/avatar.css` | 17 | 20 | 7.2 KB |
| `assets/css/components/forms-actions/form-action-contract.css` | 17 | 1 | 7.1 KB |
| `assets/css/core/responsive-runtime.css` | 17 | 0 | 1.5 KB |
| `assets/css/core/layout/responsive-shell.css` | 16 | 479 | 26.0 KB |
| `assets/css/core/layout/topbar.css` | 16 | 67 | 21.0 KB |
| `assets/css/core/mobile/ui-standard.css` | 16 | 17 | 7.6 KB |
| `assets/css/core/layout/responsive-base.css` | 16 | 7 | 13.4 KB |
| `assets/css/core/ui/patterns.css` | 16 | 2 | 7.6 KB |
| `assets/css/core/ui/global-components.css` | 16 | 1 | 19.5 KB |
| `assets/css/core/layout/shell.css` | 16 | 0 | 8.2 KB |
| `assets/css/components/base/buttons.css` | 16 | 0 | 4.1 KB |
| `assets/css/components/base/chips-badges.css` | 16 | 0 | 2.8 KB |
| `assets/css/components/base/forms.css` | 16 | 0 | 2.0 KB |
| `assets/css/components/base/modals.css` | 16 | 0 | 1.5 KB |
| `assets/css/components/base/sections.css` | 16 | 0 | 0.9 KB |
| `assets/css/components/base/rating.css` | 16 | 0 | 0.6 KB |
| `assets/css/core/index.css` | 16 | 0 | 0.5 KB |
| `assets/css/components/base/index.css` | 16 | 0 | 0.5 KB |
| `assets/css/core/components.css` | 16 | 0 | 0.4 KB |
| `assets/css/core/layout/index.css` | 16 | 0 | 0.3 KB |
| `assets/css/core/mobile-ui-standard.css` | 16 | 0 | 0.2 KB |
| `assets/css/core/layout.css` | 16 | 0 | 0.1 KB |
| `assets/css/components/navigation/mobile-drawer-standard.css` | 15 | 187 | 9.5 KB |

## CSS carregados com mais `!important`

| CSS | !important | Páginas | Tamanho |
|---|---:|---:|---:|
| `assets/css/pages/perfil-reference-hero.css` | 4522 | 1 | 294.3 KB |
| `assets/css/pages/home.css` | 2802 | 1 | 227.1 KB |
| `assets/css/pages/mensagens/desktop-redesign.css` | 1945 | 2 | 112.5 KB |
| `assets/css/pages/perfil/mobile-public-profile.css` | 1459 | 1 | 106.0 KB |
| `assets/css/components/internal/chat-workspace-contract.css` | 1440 | 2 | 87.9 KB |
| `assets/css/pages/home/mobile/sections.css` | 1042 | 1 | 61.3 KB |
| `assets/css/pages/home/index-final-refinement.css` | 962 | 1 | 61.1 KB |
| `assets/css/components/shell/doke-shell-contract.css` | 831 | 10 | 75.1 KB |
| `assets/css/pages/search-results.css` | 813 | 1 | 69.7 KB |
| `assets/css/pages/comunidade-interna/message-rebuild.css` | 747 | 1 | 40.2 KB |
| `assets/css/components/navigation/app-mobile-header-contract.css` | 700 | 3 | 42.9 KB |
| `assets/css/components/before-after-workers-preview.css` | 672 | 3 | 41.8 KB |
| `assets/css/pages/home/mobile/search.css` | 490 | 1 | 23.5 KB |
| `assets/css/core/layout/responsive-shell.css` | 479 | 16 | 26.0 KB |
| `assets/css/components/domain/doke-domain-cards.css` | 451 | 10 | 31.2 KB |
| `assets/css/pages/home-search-chrome.css` | 429 | 1 | 43.4 KB |
| `assets/css/pages/home-sections.css` | 377 | 1 | 82.9 KB |
| `assets/css/components/shell/mobile-app-shell.css` | 363 | 11 | 26.7 KB |
| `assets/css/components/before-after-workers-preview/mobile-comment-sheets.css` | 308 | 3 | 17.5 KB |
| `assets/css/components/before-after-workers-preview/workers-mobile-fullscreen-contract.css` | 296 | 3 | 16.7 KB |
| `assets/css/pages/home-refresh/mobile-index-pass.css` | 287 | 1 | 37.1 KB |
| `assets/css/components/overlays/mobile-action-surface-contract.css` | 260 | 2 | 14.2 KB |
| `assets/css/pages/home-overlays/workers-feed-polish.css` | 250 | 1 | 17.9 KB |
| `assets/css/pages/home/mobile/drawer.css` | 236 | 1 | 22.5 KB |
| `assets/css/pages/home-tablet.css` | 234 | 1 | 16.5 KB |

## CSS carregados mais pesados

| CSS | Tamanho | !important | Páginas |
|---|---:|---:|---:|
| `assets/css/pages/perfil-reference-hero.css` | 294.3 KB | 4522 | 1 |
| `assets/css/pages/home.css` | 227.1 KB | 2802 | 1 |
| `assets/css/pages/mensagens/desktop-redesign.css` | 112.5 KB | 1945 | 2 |
| `assets/css/pages/perfil/mobile-public-profile.css` | 106.0 KB | 1459 | 1 |
| `assets/css/components/internal/chat-workspace-contract.css` | 87.9 KB | 1440 | 2 |
| `assets/css/pages/home-sections.css` | 82.9 KB | 377 | 1 |
| `assets/css/components/shell/doke-shell-contract.css` | 75.1 KB | 831 | 10 |
| `assets/css/pages/pedidos/orders-command-center.css` | 70.6 KB | 4 | 1 |
| `assets/css/pages/search-results.css` | 69.7 KB | 813 | 1 |
| `assets/css/pages/pedidos.css` | 69.4 KB | 45 | 1 |
| `assets/css/pages/home/mobile/sections.css` | 61.3 KB | 1042 | 1 |
| `assets/css/pages/home/index-final-refinement.css` | 61.1 KB | 962 | 1 |
| `assets/css/pages/perfil.css` | 57.3 KB | 8 | 1 |
| `assets/css/pages/home-search-chrome.css` | 43.4 KB | 429 | 1 |
| `assets/css/components/navigation/app-mobile-header-contract.css` | 42.9 KB | 700 | 3 |
| `assets/css/components/before-after-workers-preview.css` | 41.8 KB | 672 | 3 |
| `assets/css/pages/comunidade-interna/message-rebuild.css` | 40.2 KB | 747 | 1 |
| `assets/css/pages/perfil-publications.css` | 39.6 KB | 198 | 1 |
| `assets/css/pages/home-refresh/mobile-index-pass.css` | 37.1 KB | 287 | 1 |
| `assets/css/components/shell/app-shell.css` | 32.2 KB | 180 | 15 |
| `assets/css/pages/carteira.css` | 31.5 KB | 61 | 1 |
| `assets/css/components/domain/doke-domain-cards.css` | 31.2 KB | 451 | 10 |
| `assets/css/pages/comunidade/photo-discovery.css` | 28.4 KB | 24 | 1 |
| `assets/css/components/shell/mobile-app-shell.css` | 26.7 KB | 363 | 11 |
| `assets/css/core/layout/responsive-shell.css` | 26.0 KB | 479 | 16 |

## Diagnóstico por HTML

### `index.html`

- Severidade: **Crítica**
- CSS carregados: **134** (1592.7 KB)
- JS carregados: **43** (357.7 KB)
- `!important` carregado: **14528**
- Inline styles: **0**
- Status: **superfície crítica** — exige baseline visual antes de limpeza.
- CSS suspeitos/legados carregados:
  - `assets/css/components/shell/doke-shell-contract.css`
  - `assets/css/components/layout/responsive-page-contract.css`
  - `assets/css/components/internal/surface-contract.css`
  - `assets/css/pages/search-results/results-density-preview-contract.css`
  - `assets/css/components/before-after-workers-preview/mobile-interaction-contract.css`
  - `assets/css/components/before-after-workers-preview/workers-mobile-fullscreen-contract.css`
  - `assets/css/components/cards/mobile-card-contract.css`
  - `assets/css/components/ui-surface/surface-contract.css`
  - `assets/css/components/cards/card-grid-contract.css`
  - `assets/css/components/overlays/overlay-contract.css`
  - `assets/css/components/forms-actions/form-action-contract.css`
  - `assets/css/components/shell/page-container-contract.css`
  - ...mais 2
- CSS com maior peso técnico nesta página:
  - `assets/css/pages/home.css` — 227.1 KB, 2802 !important
  - `assets/css/pages/home/mobile/sections.css` — 61.3 KB, 1042 !important
  - `assets/css/pages/home/index-final-refinement.css` — 61.1 KB, 962 !important
  - `assets/css/components/shell/doke-shell-contract.css` — 75.1 KB, 831 !important
  - `assets/css/components/before-after-workers-preview.css` — 41.8 KB, 672 !important
  - `assets/css/pages/home/mobile/search.css` — 23.5 KB, 490 !important
  - `assets/css/core/layout/responsive-shell.css` — 26.0 KB, 479 !important
  - `assets/css/components/domain/doke-domain-cards.css` — 31.2 KB, 451 !important
- Ação recomendada:
  - Congelar screenshot/baseline antes de mexer. Reduzir por blocos pequenos, começando por imports suspeitos e componentes duplicados.

### `resultados.html`

- Severidade: **Crítica**
- CSS carregados: **116** (920.0 KB)
- JS carregados: **36** (266.0 KB)
- `!important` carregado: **7295**
- Inline styles: **0**
- Status: **HTML em evolução** — não consolidar visual provisório como contrato global.
- Status: **superfície crítica** — exige baseline visual antes de limpeza.
- CSS suspeitos/legados carregados:
  - `assets/css/pages/search-results/preview-parity.css`
  - `assets/css/pages/search-results/final-parity.css`
  - `assets/css/pages/search-results/mobile-card-contract.css`
  - `assets/css/pages/search-results/final-normalization.css`
  - `assets/css/pages/search-results/results-density-preview-contract.css`
  - `assets/css/components/before-after-workers-preview/mobile-interaction-contract.css`
  - `assets/css/components/before-after-workers-preview/workers-mobile-fullscreen-contract.css`
  - `assets/css/components/cards/mobile-card-contract.css`
  - `assets/css/components/ui-surface/surface-contract.css`
  - `assets/css/components/cards/card-grid-contract.css`
  - `assets/css/components/overlays/overlay-contract.css`
  - `assets/css/components/forms-actions/form-action-contract.css`
  - ...mais 6
- CSS com maior peso técnico nesta página:
  - `assets/css/components/shell/doke-shell-contract.css` — 75.1 KB, 831 !important
  - `assets/css/pages/search-results.css` — 69.7 KB, 813 !important
  - `assets/css/components/before-after-workers-preview.css` — 41.8 KB, 672 !important
  - `assets/css/core/layout/responsive-shell.css` — 26.0 KB, 479 !important
  - `assets/css/components/domain/doke-domain-cards.css` — 31.2 KB, 451 !important
  - `assets/css/components/shell/mobile-app-shell.css` — 26.7 KB, 363 !important
  - `assets/css/components/before-after-workers-preview/mobile-comment-sheets.css` — 17.5 KB, 308 !important
  - `assets/css/components/before-after-workers-preview/workers-mobile-fullscreen-contract.css` — 16.7 KB, 296 !important
- Ação recomendada:
  - Congelar screenshot/baseline antes de mexer. Reduzir por blocos pequenos, começando por imports suspeitos e componentes duplicados.

### `perfil.html`

- Severidade: **Crítica**
- CSS carregados: **105** (1379.7 KB)
- JS carregados: **38** (341.9 KB)
- `!important` carregado: **11692**
- Inline styles: **1**
- Status: **superfície crítica** — exige baseline visual antes de limpeza.
- CSS suspeitos/legados carregados:
  - `assets/css/components/internal/surface-contract.css`
  - `assets/css/components/before-after-workers-preview/mobile-interaction-contract.css`
  - `assets/css/components/before-after-workers-preview/workers-mobile-fullscreen-contract.css`
  - `assets/css/components/cards/card-grid-contract.css`
  - `assets/css/components/forms-actions/form-action-contract.css`
  - `assets/css/components/overlays/overlay-contract.css`
  - `assets/css/components/ui-surface/surface-contract.css`
  - `assets/css/pages/perfil-budget-modal/final-polish-success.css`
  - `assets/css/components/shell/page-container-contract.css`
  - `assets/css/components/shell/doke-shell-contract.css`
  - `assets/css/components/layout/responsive-page-contract.css`
- CSS com maior peso técnico nesta página:
  - `assets/css/pages/perfil-reference-hero.css` — 294.3 KB, 4522 !important
  - `assets/css/pages/perfil/mobile-public-profile.css` — 106.0 KB, 1459 !important
  - `assets/css/components/shell/doke-shell-contract.css` — 75.1 KB, 831 !important
  - `assets/css/components/before-after-workers-preview.css` — 41.8 KB, 672 !important
  - `assets/css/core/layout/responsive-shell.css` — 26.0 KB, 479 !important
  - `assets/css/components/domain/doke-domain-cards.css` — 31.2 KB, 451 !important
  - `assets/css/components/shell/mobile-app-shell.css` — 26.7 KB, 363 !important
  - `assets/css/components/before-after-workers-preview/mobile-comment-sheets.css` — 17.5 KB, 308 !important
- Ação recomendada:
  - Congelar screenshot/baseline antes de mexer. Reduzir por blocos pequenos, começando por imports suspeitos e componentes duplicados.

### `comunidade-interna.html`

- Severidade: **Crítica**
- CSS carregados: **100** (1005.5 KB)
- JS carregados: **31** (148.2 KB)
- `!important` carregado: **8177**
- Inline styles: **0**
- Status: **HTML em evolução** — não consolidar visual provisório como contrato global.
- Status: **superfície crítica** — exige baseline visual antes de limpeza.
- CSS suspeitos/legados carregados:
  - `assets/css/components/internal/surface-contract.css`
  - `assets/css/components/cards/card-grid-contract.css`
  - `assets/css/components/forms-actions/form-action-contract.css`
  - `assets/css/components/overlays/overlay-contract.css`
  - `assets/css/components/ui-surface/surface-contract.css`
  - `assets/css/pages/comunidade-interna/internal-modal-legacy.css`
  - `assets/css/pages/comunidade-interna/final-room-layout.css`
  - `assets/css/pages/comunidade-interna/compact-final-adjustments.css`
  - `assets/css/pages/comunidade-interna/mobile-interaction-contract.css`
  - `assets/css/components/internal/chat-workspace-contract.css`
  - `assets/css/components/shell/page-container-contract.css`
  - `assets/css/components/shell/doke-shell-contract.css`
  - ...mais 2
- CSS com maior peso técnico nesta página:
  - `assets/css/pages/mensagens/desktop-redesign.css` — 112.5 KB, 1945 !important
  - `assets/css/components/internal/chat-workspace-contract.css` — 87.9 KB, 1440 !important
  - `assets/css/components/shell/doke-shell-contract.css` — 75.1 KB, 831 !important
  - `assets/css/pages/comunidade-interna/message-rebuild.css` — 40.2 KB, 747 !important
  - `assets/css/core/layout/responsive-shell.css` — 26.0 KB, 479 !important
  - `assets/css/components/domain/doke-domain-cards.css` — 31.2 KB, 451 !important
  - `assets/css/components/shell/mobile-app-shell.css` — 26.7 KB, 363 !important
  - `assets/css/components/ui-surface/modal-alignment.css` — 15.2 KB, 218 !important
- Ação recomendada:
  - Congelar screenshot/baseline antes de mexer. Reduzir por blocos pequenos, começando por imports suspeitos e componentes duplicados.

### `comunidade.html`

- Severidade: **Crítica**
- CSS carregados: **87** (713.5 KB)
- JS carregados: **32** (140.4 KB)
- `!important` carregado: **3684**
- Inline styles: **0**
- CSS suspeitos/legados carregados:
  - `assets/css/components/internal/surface-contract.css`
  - `assets/css/components/cards/card-grid-contract.css`
  - `assets/css/components/forms-actions/form-action-contract.css`
  - `assets/css/components/overlays/overlay-contract.css`
  - `assets/css/components/ui-surface/surface-contract.css`
  - `assets/css/pages/comunidade/internal-modal-legacy.css`
  - `assets/css/pages/comunidade/mobile-interaction-contract.css`
  - `assets/css/components/shell/page-container-contract.css`
  - `assets/css/components/shell/doke-shell-contract.css`
  - `assets/css/components/layout/responsive-page-contract.css`
  - `assets/css/pages/comunidade/mobile-layout-contract.css`
- CSS com maior peso técnico nesta página:
  - `assets/css/components/shell/doke-shell-contract.css` — 75.1 KB, 831 !important
  - `assets/css/core/layout/responsive-shell.css` — 26.0 KB, 479 !important
  - `assets/css/components/domain/doke-domain-cards.css` — 31.2 KB, 451 !important
  - `assets/css/components/shell/mobile-app-shell.css` — 26.7 KB, 363 !important
  - `assets/css/components/ui-surface/modal-alignment.css` — 15.2 KB, 218 !important
  - `assets/css/components/navigation/mobile-drawer-standard.css` — 9.5 KB, 187 !important
  - `assets/css/components/layout/responsive-page-contract.css` — 20.1 KB, 183 !important
  - `assets/css/components/shell/app-shell.css` — 32.2 KB, 180 !important
- Ação recomendada:
  - Congelar screenshot/baseline antes de mexer. Reduzir por blocos pequenos, começando por imports suspeitos e componentes duplicados.

### `notificacoes.html`

- Severidade: **Crítica**
- CSS carregados: **85** (635.7 KB)
- JS carregados: **32** (154.5 KB)
- `!important` carregado: **4027**
- Inline styles: **0**
- CSS suspeitos/legados carregados:
  - `assets/css/components/internal/surface-contract.css`
  - `assets/css/pages/notificacoes/pedidos-parity.css`
  - `assets/css/pages/notificacoes/selection-parity.css`
  - `assets/css/pages/notificacoes/mobile-interaction-contract.css`
  - `assets/css/components/ui-surface/surface-contract.css`
  - `assets/css/components/cards/card-grid-contract.css`
  - `assets/css/components/overlays/overlay-contract.css`
  - `assets/css/components/forms-actions/form-action-contract.css`
  - `assets/css/components/shell/page-container-contract.css`
  - `assets/css/components/overlays/mobile-action-surface-contract.css`
  - `assets/css/components/shell/doke-shell-contract.css`
  - `assets/css/components/layout/responsive-page-contract.css`
- CSS com maior peso técnico nesta página:
  - `assets/css/components/shell/doke-shell-contract.css` — 75.1 KB, 831 !important
  - `assets/css/core/layout/responsive-shell.css` — 26.0 KB, 479 !important
  - `assets/css/components/domain/doke-domain-cards.css` — 31.2 KB, 451 !important
  - `assets/css/components/shell/mobile-app-shell.css` — 26.7 KB, 363 !important
  - `assets/css/components/overlays/mobile-action-surface-contract.css` — 14.2 KB, 260 !important
  - `assets/css/components/ui-surface/modal-alignment.css` — 15.2 KB, 218 !important
  - `assets/css/components/navigation/mobile-drawer-standard.css` — 9.5 KB, 187 !important
  - `assets/css/components/layout/responsive-page-contract.css` — 20.1 KB, 183 !important
- Ação recomendada:
  - Congelar screenshot/baseline antes de mexer. Reduzir por blocos pequenos, começando por imports suspeitos e componentes duplicados.

### `pedidos.html`

- Severidade: **Crítica**
- CSS carregados: **80** (789.9 KB)
- JS carregados: **45** (227.5 KB)
- `!important` carregado: **4226**
- Inline styles: **3**
- Status: **superfície crítica** — exige baseline visual antes de limpeza.
- CSS suspeitos/legados carregados:
  - `assets/css/components/internal/surface-contract.css`
  - `assets/css/components/ui-surface/surface-contract.css`
  - `assets/css/components/cards/card-grid-contract.css`
  - `assets/css/components/overlays/overlay-contract.css`
  - `assets/css/components/forms-actions/form-action-contract.css`
  - `assets/css/components/shell/page-container-contract.css`
  - `assets/css/components/overlays/mobile-action-surface-contract.css`
  - `assets/css/components/shell/doke-shell-contract.css`
  - `assets/css/components/layout/responsive-page-contract.css`
- CSS com maior peso técnico nesta página:
  - `assets/css/components/shell/doke-shell-contract.css` — 75.1 KB, 831 !important
  - `assets/css/core/layout/responsive-shell.css` — 26.0 KB, 479 !important
  - `assets/css/components/domain/doke-domain-cards.css` — 31.2 KB, 451 !important
  - `assets/css/components/shell/mobile-app-shell.css` — 26.7 KB, 363 !important
  - `assets/css/components/overlays/mobile-action-surface-contract.css` — 14.2 KB, 260 !important
  - `assets/css/components/ui-surface/modal-alignment.css` — 15.2 KB, 218 !important
  - `assets/css/pages/pedidos/mobile-longterm-normalization.css` — 15.9 KB, 207 !important
  - `assets/css/components/navigation/mobile-drawer-standard.css` — 9.5 KB, 187 !important
- Ação recomendada:
  - Congelar screenshot/baseline antes de mexer. Reduzir por blocos pequenos, começando por imports suspeitos e componentes duplicados.

### `configuracoes.html`

- Severidade: **Crítica**
- CSS carregados: **78** (617.8 KB)
- JS carregados: **33** (135.7 KB)
- `!important` carregado: **3654**
- Inline styles: **0**
- Status: **HTML em evolução** — não consolidar visual provisório como contrato global.
- CSS suspeitos/legados carregados:
  - `assets/css/components/internal/surface-contract.css`
  - `assets/css/components/cards/card-grid-contract.css`
  - `assets/css/components/forms-actions/form-action-contract.css`
  - `assets/css/components/overlays/overlay-contract.css`
  - `assets/css/components/ui-surface/surface-contract.css`
  - `assets/css/pages/configuracoes/final-responsive-pass.css`
  - `assets/css/components/shell/page-container-contract.css`
  - `assets/css/components/shell/doke-shell-contract.css`
  - `assets/css/components/layout/responsive-page-contract.css`
- CSS com maior peso técnico nesta página:
  - `assets/css/components/shell/doke-shell-contract.css` — 75.1 KB, 831 !important
  - `assets/css/core/layout/responsive-shell.css` — 26.0 KB, 479 !important
  - `assets/css/components/domain/doke-domain-cards.css` — 31.2 KB, 451 !important
  - `assets/css/components/shell/mobile-app-shell.css` — 26.7 KB, 363 !important
  - `assets/css/components/ui-surface/modal-alignment.css` — 15.2 KB, 218 !important
  - `assets/css/components/navigation/mobile-drawer-standard.css` — 9.5 KB, 187 !important
  - `assets/css/components/layout/responsive-page-contract.css` — 20.1 KB, 183 !important
  - `assets/css/components/shell/app-shell.css` — 32.2 KB, 180 !important
- Ação recomendada:
  - Congelar screenshot/baseline antes de mexer. Reduzir por blocos pequenos, começando por imports suspeitos e componentes duplicados.

### `mensagens.html`

- Severidade: **Crítica**
- CSS carregados: **77** (806.8 KB)
- JS carregados: **33** (192.5 KB)
- `!important` carregado: **7244**
- Inline styles: **0**
- Status: **superfície crítica** — exige baseline visual antes de limpeza.
- CSS suspeitos/legados carregados:
  - `assets/css/components/internal/surface-contract.css`
  - `assets/css/components/ui-surface/surface-contract.css`
  - `assets/css/components/cards/card-grid-contract.css`
  - `assets/css/components/overlays/overlay-contract.css`
  - `assets/css/components/forms-actions/form-action-contract.css`
  - `assets/css/components/shell/page-container-contract.css`
  - `assets/css/components/shell/doke-shell-contract.css`
  - `assets/css/components/layout/responsive-page-contract.css`
  - `assets/css/components/internal/chat-workspace-contract.css`
  - `assets/css/pages/mensagens/desktop-redesign.css`
- CSS com maior peso técnico nesta página:
  - `assets/css/pages/mensagens/desktop-redesign.css` — 112.5 KB, 1945 !important
  - `assets/css/components/internal/chat-workspace-contract.css` — 87.9 KB, 1440 !important
  - `assets/css/components/shell/doke-shell-contract.css` — 75.1 KB, 831 !important
  - `assets/css/core/layout/responsive-shell.css` — 26.0 KB, 479 !important
  - `assets/css/components/domain/doke-domain-cards.css` — 31.2 KB, 451 !important
  - `assets/css/components/shell/mobile-app-shell.css` — 26.7 KB, 363 !important
  - `assets/css/components/ui-surface/modal-alignment.css` — 15.2 KB, 218 !important
  - `assets/css/components/navigation/mobile-drawer-standard.css` — 9.5 KB, 187 !important
- Ação recomendada:
  - Congelar screenshot/baseline antes de mexer. Reduzir por blocos pequenos, começando por imports suspeitos e componentes duplicados.

### `carteira.html`

- Severidade: **Crítica**
- CSS carregados: **70** (626.5 KB)
- JS carregados: **31** (120.4 KB)
- `!important` carregado: **3690**
- Inline styles: **3**
- Status: **HTML em evolução** — não consolidar visual provisório como contrato global.
- CSS suspeitos/legados carregados:
  - `assets/css/components/internal/surface-contract.css`
  - `assets/css/components/cards/card-grid-contract.css`
  - `assets/css/components/forms-actions/form-action-contract.css`
  - `assets/css/components/overlays/overlay-contract.css`
  - `assets/css/components/ui-surface/surface-contract.css`
  - `assets/css/components/shell/page-container-contract.css`
  - `assets/css/components/shell/doke-shell-contract.css`
  - `assets/css/components/layout/responsive-page-contract.css`
- CSS com maior peso técnico nesta página:
  - `assets/css/components/shell/doke-shell-contract.css` — 75.1 KB, 831 !important
  - `assets/css/core/layout/responsive-shell.css` — 26.0 KB, 479 !important
  - `assets/css/components/domain/doke-domain-cards.css` — 31.2 KB, 451 !important
  - `assets/css/components/shell/mobile-app-shell.css` — 26.7 KB, 363 !important
  - `assets/css/components/ui-surface/modal-alignment.css` — 15.2 KB, 218 !important
  - `assets/css/components/navigation/mobile-drawer-standard.css` — 9.5 KB, 187 !important
  - `assets/css/components/layout/responsive-page-contract.css` — 20.1 KB, 183 !important
  - `assets/css/components/shell/app-shell.css` — 32.2 KB, 180 !important
- Ação recomendada:
  - Congelar screenshot/baseline antes de mexer. Reduzir por blocos pequenos, começando por imports suspeitos e componentes duplicados.

### `avaliacao.html`

- Severidade: **Crítica**
- CSS carregados: **59** (462.2 KB)
- JS carregados: **4** (62.0 KB)
- `!important` carregado: **2894**
- Inline styles: **0**
- Status: **HTML em evolução** — não consolidar visual provisório como contrato global.
- CSS suspeitos/legados carregados:
  - `assets/css/components/internal/surface-contract.css`
  - `assets/css/components/cards/card-grid-contract.css`
  - `assets/css/components/forms-actions/form-action-contract.css`
  - `assets/css/components/overlays/overlay-contract.css`
  - `assets/css/components/ui-surface/surface-contract.css`
  - `assets/css/components/shell/page-container-contract.css`
  - `assets/css/components/navigation/app-mobile-header-contract.css`
  - `assets/css/components/navigation/mobile-page-rhythm-contract.css`
- CSS com maior peso técnico nesta página:
  - `assets/css/components/navigation/app-mobile-header-contract.css` — 42.9 KB, 700 !important
  - `assets/css/core/layout/responsive-shell.css` — 26.0 KB, 479 !important
  - `assets/css/components/navigation/mobile-page-rhythm-contract.css` — 13.5 KB, 227 !important
  - `assets/css/components/ui-surface/modal-alignment.css` — 15.2 KB, 218 !important
  - `assets/css/components/navigation/mobile-drawer-standard.css` — 9.5 KB, 187 !important
  - `assets/css/components/shell/app-shell.css` — 32.2 KB, 180 !important
  - `assets/css/components/internal/list-page-toolbar.css` — 24.1 KB, 123 !important
  - `assets/css/components/ui-surface/buttons-close.css` — 8.3 KB, 105 !important
- Ação recomendada:
  - Congelar screenshot/baseline antes de mexer. Reduzir por blocos pequenos, começando por imports suspeitos e componentes duplicados.

### `finalizar-pedido.html`

- Severidade: **Crítica**
- CSS carregados: **59** (462.2 KB)
- JS carregados: **4** (60.2 KB)
- `!important` carregado: **2894**
- Inline styles: **0**
- Status: **HTML em evolução** — não consolidar visual provisório como contrato global.
- CSS suspeitos/legados carregados:
  - `assets/css/components/internal/surface-contract.css`
  - `assets/css/components/cards/card-grid-contract.css`
  - `assets/css/components/forms-actions/form-action-contract.css`
  - `assets/css/components/overlays/overlay-contract.css`
  - `assets/css/components/ui-surface/surface-contract.css`
  - `assets/css/components/shell/page-container-contract.css`
  - `assets/css/components/navigation/app-mobile-header-contract.css`
  - `assets/css/components/navigation/mobile-page-rhythm-contract.css`
- CSS com maior peso técnico nesta página:
  - `assets/css/components/navigation/app-mobile-header-contract.css` — 42.9 KB, 700 !important
  - `assets/css/core/layout/responsive-shell.css` — 26.0 KB, 479 !important
  - `assets/css/components/navigation/mobile-page-rhythm-contract.css` — 13.5 KB, 227 !important
  - `assets/css/components/ui-surface/modal-alignment.css` — 15.2 KB, 218 !important
  - `assets/css/components/navigation/mobile-drawer-standard.css` — 9.5 KB, 187 !important
  - `assets/css/components/shell/app-shell.css` — 32.2 KB, 180 !important
  - `assets/css/components/internal/list-page-toolbar.css` — 24.1 KB, 123 !important
  - `assets/css/components/ui-surface/buttons-close.css` — 8.3 KB, 105 !important
- Ação recomendada:
  - Congelar screenshot/baseline antes de mexer. Reduzir por blocos pequenos, começando por imports suspeitos e componentes duplicados.

### `pagamento.html`

- Severidade: **Crítica**
- CSS carregados: **59** (464.6 KB)
- JS carregados: **4** (69.9 KB)
- `!important` carregado: **2894**
- Inline styles: **0**
- Status: **HTML em evolução** — não consolidar visual provisório como contrato global.
- CSS suspeitos/legados carregados:
  - `assets/css/components/internal/surface-contract.css`
  - `assets/css/components/cards/card-grid-contract.css`
  - `assets/css/components/forms-actions/form-action-contract.css`
  - `assets/css/components/overlays/overlay-contract.css`
  - `assets/css/components/ui-surface/surface-contract.css`
  - `assets/css/components/shell/page-container-contract.css`
  - `assets/css/components/navigation/app-mobile-header-contract.css`
  - `assets/css/components/navigation/mobile-page-rhythm-contract.css`
- CSS com maior peso técnico nesta página:
  - `assets/css/components/navigation/app-mobile-header-contract.css` — 42.9 KB, 700 !important
  - `assets/css/core/layout/responsive-shell.css` — 26.0 KB, 479 !important
  - `assets/css/components/navigation/mobile-page-rhythm-contract.css` — 13.5 KB, 227 !important
  - `assets/css/components/ui-surface/modal-alignment.css` — 15.2 KB, 218 !important
  - `assets/css/components/navigation/mobile-drawer-standard.css` — 9.5 KB, 187 !important
  - `assets/css/components/shell/app-shell.css` — 32.2 KB, 180 !important
  - `assets/css/components/internal/list-page-toolbar.css` — 24.1 KB, 123 !important
  - `assets/css/components/ui-surface/buttons-close.css` — 8.3 KB, 105 !important
- Ação recomendada:
  - Congelar screenshot/baseline antes de mexer. Reduzir por blocos pequenos, começando por imports suspeitos e componentes duplicados.

### `adicionar-cartao.html`

- Severidade: **Crítica**
- CSS carregados: **51** (363.1 KB)
- JS carregados: **4** (57.3 KB)
- `!important` carregado: **1770**
- Inline styles: **0**
- Status: **HTML em evolução** — não consolidar visual provisório como contrato global.
- CSS suspeitos/legados carregados:
  - `assets/css/components/cards/card-grid-contract.css`
  - `assets/css/components/forms-actions/form-action-contract.css`
  - `assets/css/components/overlays/overlay-contract.css`
  - `assets/css/components/ui-surface/surface-contract.css`
- CSS com maior peso técnico nesta página:
  - `assets/css/core/layout/responsive-shell.css` — 26.0 KB, 479 !important
  - `assets/css/components/ui-surface/modal-alignment.css` — 15.2 KB, 218 !important
  - `assets/css/components/navigation/mobile-drawer-standard.css` — 9.5 KB, 187 !important
  - `assets/css/components/shell/app-shell.css` — 32.2 KB, 180 !important
  - `assets/css/components/ui-surface/buttons-close.css` — 8.3 KB, 105 !important
  - `assets/css/components/navigation/header-mobile.css` — 12.1 KB, 97 !important
  - `assets/css/patterns/responsive-polish.css` — 8.8 KB, 74 !important
  - `assets/css/components/navigation/bottom-nav.css` — 7.0 KB, 68 !important
- Ação recomendada:
  - Congelar screenshot/baseline antes de mexer. Reduzir por blocos pequenos, começando por imports suspeitos e componentes duplicados.

### `detalhe-anuncio.html`

- Severidade: **Alta**
- CSS carregados: **27** (176.1 KB)
- JS carregados: **3** (52.9 KB)
- `!important` carregado: **948**
- Inline styles: **0**
- Status: **HTML em evolução** — não consolidar visual provisório como contrato global.
- CSS com maior peso técnico nesta página:
  - `assets/css/core/layout/responsive-shell.css` — 26.0 KB, 479 !important
  - `assets/css/components/navigation/mobile-drawer-standard.css` — 9.5 KB, 187 !important
  - `assets/css/components/shell/app-shell.css` — 32.2 KB, 180 !important
  - `assets/css/core/layout/topbar.css` — 21.0 KB, 67 !important
  - `assets/css/core/mobile/ui-standard.css` — 7.6 KB, 17 !important
  - `assets/css/core/layout/responsive-base.css` — 13.4 KB, 7 !important
  - `assets/css/core/base.css` — 4.3 KB, 4 !important
  - `assets/css/core/responsive-foundation.css` — 1.8 KB, 4 !important
- Ação recomendada:
  - Mapear imports por responsabilidade e remover legado apenas após validar tela desktop/mobile.

### `docs/ui-kit.html`

- Severidade: **Alta**
- CSS carregados: **24** (179.0 KB)
- JS carregados: **0** (0.0 KB)
- `!important` carregado: **940**
- Inline styles: **4**
- CSS com maior peso técnico nesta página:
  - `assets/css/core/layout/responsive-shell.css` — 26.0 KB, 479 !important
  - `assets/css/components/shell/mobile-app-shell.css` — 26.7 KB, 363 !important
  - `assets/css/core/layout/topbar.css` — 21.0 KB, 67 !important
  - `assets/css/core/mobile/ui-standard.css` — 7.6 KB, 17 !important
  - `assets/css/core/layout/responsive-base.css` — 13.4 KB, 7 !important
  - `assets/css/core/base.css` — 4.3 KB, 4 !important
  - `assets/css/core/ui/patterns.css` — 7.6 KB, 2 !important
  - `assets/css/core/ui/global-components.css` — 19.5 KB, 1 !important
- Ação recomendada:
  - Mapear imports por responsabilidade e remover legado apenas após validar tela desktop/mobile.

### `auth/cadastro.html`

- Severidade: **Média**
- CSS carregados: **12** (101.6 KB)
- JS carregados: **4** (37.6 KB)
- `!important` carregado: **123**
- Inline styles: **0**
- CSS suspeitos/legados carregados:
  - `assets/css/components/forms-actions/form-action-contract.css`
- CSS com maior peso técnico nesta página:
  - `assets/css/components/navigation/header-mobile.css` — 12.1 KB, 97 !important
  - `assets/css/components/avatar.css` — 7.2 KB, 20 !important
  - `assets/css/core/base.css` — 4.3 KB, 4 !important
  - `assets/css/pages/auth.css` — 9.3 KB, 1 !important
  - `assets/css/components/forms-actions/form-action-contract.css` — 7.1 KB, 1 !important
  - `assets/css/core/responsive-audit.css` — 18.6 KB, 0 !important
  - `assets/css/components/cards/card-system.css` — 14.3 KB, 0 !important
  - `assets/css/core/tokens.css` — 10.5 KB, 0 !important
- Ação recomendada:
  - Manter monitorada e evitar novos imports locais desnecessários.

### `auth/esqueci-senha.html`

- Severidade: **Média**
- CSS carregados: **12** (101.6 KB)
- JS carregados: **4** (37.6 KB)
- `!important` carregado: **123**
- Inline styles: **0**
- CSS suspeitos/legados carregados:
  - `assets/css/components/forms-actions/form-action-contract.css`
- CSS com maior peso técnico nesta página:
  - `assets/css/components/navigation/header-mobile.css` — 12.1 KB, 97 !important
  - `assets/css/components/avatar.css` — 7.2 KB, 20 !important
  - `assets/css/core/base.css` — 4.3 KB, 4 !important
  - `assets/css/pages/auth.css` — 9.3 KB, 1 !important
  - `assets/css/components/forms-actions/form-action-contract.css` — 7.1 KB, 1 !important
  - `assets/css/core/responsive-audit.css` — 18.6 KB, 0 !important
  - `assets/css/components/cards/card-system.css` — 14.3 KB, 0 !important
  - `assets/css/core/tokens.css` — 10.5 KB, 0 !important
- Ação recomendada:
  - Manter monitorada e evitar novos imports locais desnecessários.

### `auth/login.html`

- Severidade: **Média**
- CSS carregados: **12** (101.6 KB)
- JS carregados: **4** (37.6 KB)
- `!important` carregado: **123**
- Inline styles: **0**
- CSS suspeitos/legados carregados:
  - `assets/css/components/forms-actions/form-action-contract.css`
- CSS com maior peso técnico nesta página:
  - `assets/css/components/navigation/header-mobile.css` — 12.1 KB, 97 !important
  - `assets/css/components/avatar.css` — 7.2 KB, 20 !important
  - `assets/css/core/base.css` — 4.3 KB, 4 !important
  - `assets/css/pages/auth.css` — 9.3 KB, 1 !important
  - `assets/css/components/forms-actions/form-action-contract.css` — 7.1 KB, 1 !important
  - `assets/css/core/responsive-audit.css` — 18.6 KB, 0 !important
  - `assets/css/components/cards/card-system.css` — 14.3 KB, 0 !important
  - `assets/css/core/tokens.css` — 10.5 KB, 0 !important
- Ação recomendada:
  - Manter monitorada e evitar novos imports locais desnecessários.

### `teste.html`

- Severidade: **Baixa**
- CSS carregados: **0** (0.0 KB)
- JS carregados: **0** (0.0 KB)
- `!important` carregado: **0**
- Inline styles: **0**
- CSS com maior peso técnico nesta página:
- Ação recomendada:
  - Manter monitorada e evitar novos imports locais desnecessários.

### `tools/responsive-stage13-dashboard.html`

- Severidade: **Baixa**
- CSS carregados: **0** (0.0 KB)
- JS carregados: **0** (0.0 KB)
- `!important` carregado: **0**
- Inline styles: **0**
- CSS com maior peso técnico nesta página:
- Ação recomendada:
  - Manter monitorada e evitar novos imports locais desnecessários.

## Próxima ação recomendada

1. Não remover CSS em massa.
2. Usar este inventário para escolher o primeiro grupo de limpeza.
3. Começar pelo contrato global de componentes compartilhados e pelo shell/container, não por redesign de páginas provisórias.
4. Para páginas críticas, exigir baseline visual antes/depois.
5. Para páginas em evolução, limpar estrutura e imports, mas não cristalizar visual provisório como contrato global.