# Ciclo Global 52 — Baseline técnico das páginas críticas

Este ciclo protege as páginas mais importantes antes de qualquer remoção real de CSS sensível. Não altera visual.

## Resumo

- Páginas auditadas: **3**
- CSS carregados somados: **361**
- JS carregados somados: **129**
- `!important` carregados somados: **31416**
- CSS ausentes: **0**
- JS ausentes: **0**

## index.html

| Métrica | Valor |
|---|---:|
| CSS carregados direta/indiretamente | 130 |
| JS diretos | 49 |
| !important carregados | 12475 |
| CSS sensíveis | 36 |
| CSS ausentes | 0 |
| JS ausentes | 0 |

### Áreas protegidas

- shell/sidebar/topbar
- hero/search area
- featured service cards
- workers rail
- publication cards
- more services grid
- mobile width rhythm

### CSS sensíveis principais

- `assets/css/pages/home.css` — 2802 !important, 227 KB
- `assets/css/pages/home/index-final-refinement.css` — 962 !important, 61 KB
- `assets/css/components/shell/doke-shell-contract.css` — 831 !important, 75 KB
- `assets/css/components/before-after-workers-preview.css` — 672 !important, 42 KB
- `assets/css/core/layout/responsive-shell.css` — 479 !important, 26 KB
- `assets/css/components/domain/doke-domain-cards.css` — 451 !important, 31 KB
- `assets/css/pages/home-search-chrome.css` — 429 !important, 43 KB
- `assets/css/pages/home-sections.css` — 377 !important, 80 KB
- `assets/css/components/shell/mobile-app-shell.css` — 363 !important, 27 KB
- `assets/css/components/before-after-workers-preview/mobile-comment-sheets.css` — 308 !important, 18 KB
- `assets/css/components/before-after-workers-preview/workers-mobile-fullscreen-contract.css` — 296 !important, 17 KB
- `assets/css/pages/home-refresh/mobile-index-pass.css` — 287 !important, 37 KB

### Contratos observados

- dokeShellBody: **sim**
- pageContentInner: **sim**
- serviceCard: **sim**
- workerCard: **sim**
- publicationCard: **sim**
- reviewCard: **não**
- dataHooks: **sim**

## resultados.html

| Métrica | Valor |
|---|---:|
| CSS carregados direta/indiretamente | 121 |
| JS diretos | 42 |
| !important carregados | 7272 |
| CSS sensíveis | 32 |
| CSS ausentes | 0 |
| JS ausentes | 0 |

### Áreas protegidas

- shell/sidebar/topbar
- search/filter bar
- result service cards
- grid/list rhythm
- favorite actions
- empty/loading states
- mobile filters and card width

### CSS sensíveis principais

- `assets/css/components/shell/doke-shell-contract.css` — 831 !important, 75 KB
- `assets/css/pages/search-results.css` — 813 !important, 70 KB
- `assets/css/components/before-after-workers-preview.css` — 672 !important, 42 KB
- `assets/css/core/layout/responsive-shell.css` — 479 !important, 26 KB
- `assets/css/components/domain/doke-domain-cards.css` — 451 !important, 31 KB
- `assets/css/components/shell/mobile-app-shell.css` — 363 !important, 27 KB
- `assets/css/components/before-after-workers-preview/mobile-comment-sheets.css` — 308 !important, 18 KB
- `assets/css/components/before-after-workers-preview/workers-mobile-fullscreen-contract.css` — 296 !important, 17 KB
- `assets/css/components/ui-surface/modal-alignment.css` — 218 !important, 15 KB
- `assets/css/components/navigation/mobile-drawer-standard.css` — 187 !important, 9 KB
- `assets/css/pages/search-results/mobile-polish.css` — 151 !important, 10 KB
- `assets/css/components/cards/mobile-card-contract.css` — 126 !important, 11 KB

### Contratos observados

- dokeShellBody: **sim**
- pageContentInner: **sim**
- serviceCard: **não**
- workerCard: **sim**
- publicationCard: **não**
- reviewCard: **não**
- dataHooks: **sim**

## perfil.html

| Métrica | Valor |
|---|---:|
| CSS carregados direta/indiretamente | 110 |
| JS diretos | 38 |
| !important carregados | 11669 |
| CSS sensíveis | 23 |
| CSS ausentes | 0 |
| JS ausentes | 0 |

### Áreas protegidas

- shell/sidebar/topbar
- profile hero/header
- owner/visitor/client state
- tabs/navigation
- services cards
- workers cards
- publication cards
- reviews/reputation
- mobile profile layout

### CSS sensíveis principais

- `assets/css/pages/perfil-reference-hero.css` — 4522 !important, 294 KB
- `assets/css/pages/perfil/mobile-public-profile.css` — 1459 !important, 106 KB
- `assets/css/components/shell/doke-shell-contract.css` — 831 !important, 75 KB
- `assets/css/components/before-after-workers-preview.css` — 672 !important, 42 KB
- `assets/css/core/layout/responsive-shell.css` — 479 !important, 26 KB
- `assets/css/components/domain/doke-domain-cards.css` — 451 !important, 31 KB
- `assets/css/components/shell/mobile-app-shell.css` — 363 !important, 27 KB
- `assets/css/components/before-after-workers-preview/mobile-comment-sheets.css` — 308 !important, 18 KB
- `assets/css/components/before-after-workers-preview/workers-mobile-fullscreen-contract.css` — 296 !important, 17 KB
- `assets/css/components/ui-surface/modal-alignment.css` — 218 !important, 15 KB
- `assets/css/components/navigation/mobile-drawer-standard.css` — 187 !important, 9 KB
- `assets/css/components/shell/mobile-base-stability.css` — 40 !important, 5 KB

### Contratos observados

- dokeShellBody: **sim**
- pageContentInner: **sim**
- serviceCard: **sim**
- workerCard: **sim**
- publicationCard: **não**
- reviewCard: **não**
- dataHooks: **sim**


## Decisão

1. Não remover CSS sensível destas páginas sem checklist visual.
2. Priorizar snapshots de `index.html`, `resultados.html` e `perfil.html` antes da próxima limpeza pesada.
3. Validar desktop e mobile antes/depois em toda alteração que mexer em cards, grid, shell, topbar, filtros ou perfil.
