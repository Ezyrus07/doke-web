# Ciclo Global 5 — Mapa de limpeza do `index.html`

Este relatório é operacional: ele mapeia o que precisa ser limpo no `index.html` antes de remover qualquer CSS/JS antigo.

## Resumo

- CSS carregados diretamente/por @import: **127**
- JS locais carregados: **43**
- Imports internos quebrados no index: **0**
- Ocorrências de `!important` nos CSS carregados pelo index: **14528**

## CSS mais críticos carregados pelo index

| Arquivo | KB | Linhas | !important |
|---|---:|---:|---:|
| `assets/css/pages/home.css` | 227.1 | 5966 | 2802 |
| `assets/css/pages/home/mobile/sections.css` | 61.3 | 1997 | 1042 |
| `assets/css/pages/home/index-final-refinement.css` | 61.1 | 1782 | 962 |
| `assets/css/components/shell/doke-shell-contract.css` | 75.1 | 2225 | 831 |
| `assets/css/components/before-after-workers-preview.css` | 41.8 | 1271 | 672 |
| `assets/css/pages/home/mobile/search.css` | 23.5 | 796 | 490 |
| `assets/css/core/layout/responsive-shell.css` | 26.0 | 1107 | 479 |
| `assets/css/components/domain/doke-domain-cards.css` | 31.2 | 856 | 451 |
| `assets/css/pages/home-search-chrome.css` | 43.4 | 1581 | 429 |
| `assets/css/pages/home-sections.css` | 82.9 | 3662 | 377 |
| `assets/css/components/shell/mobile-app-shell.css` | 26.7 | 729 | 363 |
| `assets/css/components/before-after-workers-preview/mobile-comment-sheets.css` | 17.5 | 519 | 308 |
| `assets/css/components/before-after-workers-preview/workers-mobile-fullscreen-contract.css` | 16.7 | 542 | 296 |
| `assets/css/pages/home-refresh/mobile-index-pass.css` | 37.1 | 1290 | 287 |
| `assets/css/pages/home-overlays/workers-feed-polish.css` | 17.9 | 716 | 250 |
| `assets/css/pages/home/mobile/drawer.css` | 22.5 | 764 | 236 |
| `assets/css/pages/home-tablet.css` | 16.5 | 536 | 234 |
| `assets/css/components/ui-surface/modal-alignment.css` | 15.2 | 553 | 218 |

## JS locais mais pesados carregados pelo index

| Arquivo | KB | Linhas |
|---|---:|---:|
| `assets/js/pages/search-results.js` | 48.2 | 1137 |
| `assets/js/core/app.js` | 45.7 | 1347 |
| `assets/js/pages/home/before-after.js` | 38.3 | 835 |
| `assets/js/pages/home.js` | 32.0 | 912 |
| `assets/js/pages/home/workers.js` | 23.0 | 562 |
| `assets/js/pages/home/filters.js` | 21.4 | 634 |
| `assets/js/pages/search-data.js` | 19.7 | 619 |
| `assets/js/components/mobile-app-shell.js` | 17.7 | 388 |
| `assets/js/pages/home/search.js` | 14.4 | 359 |
| `assets/js/core/auth-service.js` | 14.0 | 522 |
| `assets/js/pages/home/drawer.js` | 12.0 | 365 |
| `assets/js/pages/home/mobile-interaction-contract.js` | 9.4 | 279 |
| `assets/js/components/ad-card-interactions.js` | 7.1 | 208 |
| `assets/js/ui/mobile-drawer-standard.js` | 7.0 | 75 |
| `assets/js/ui/responsive-interaction-guard.js` | 4.2 | 121 |
| `assets/js/controllers/controller-data.js` | 3.8 | 128 |
| `assets/js/core/feature-flags.js` | 3.7 | 112 |
| `assets/js/services/domain-data-service.js` | 3.0 | 63 |

## Sinais de legado em `home.css`

O `home.css` tem **227.1 KB**, **5966 linhas** e **2802 !important**.

Comentários que indicam camadas históricas:

- L10: - home-refresh.css: remaining home refinements, responsive cleanup and normalization
- L17: - legacy parallel modules were archived to archive/legacy-home-css/ in 2026-04 */
- L41: @import url("../components/cards/mobile-card-contract.css?v=20260426-final-mobile-cards");
- L47: @import url("../components/cards/ad-card.css?v=20260510-index-profile-card-parity-v1");
- L60: @import url("../components/cards/mobile-list-card-system.css?v=20260428-v1-hotfix");
- L61: @import url("../components/overlays/mobile-overlay-system.css?v=20260428-overlay-hotfix");
- L62: @import url("./home/index-final-refinement.css?v=20260510-index-profile-card-parity-v1");
- L64: @import url("../components/avatar.css?v=20260429-avatar-circle-final");
- L134: /* Final compact card geometry override. */
- L423: /* Follow-up desktop alignment pass after restoring the legacy search field. */
- L751: /* 2026-05-01 — Home desktop width parity with internal pages
- L880: /* Final compact service card pass - must stay after home shell width recovery. */
- L975: /* Stage 7 — home alignment with shared shell/card contracts. */
- L1010: HOME SECTIONS + MORE SERVICES CANONICAL FIX
- L1247: /* =============== END HOME SECTIONS + MORE SERVICES CANONICAL FIX =============== */
- L1344: Scope stays restricted to Workers/Publicações, except the Mais anúncios repair below restores its grid after previous overrides. */
- L1467: /* Repair Mais anúncios after the accidental rail/card compression. */
- L1523: /* FINAL HOME MEDIA RAIL CONTRACT — Workers + Publicações only.
- L1616: /* FINAL HOME MEDIA ALIGNMENT CONTRACT — Workers + Publicações
- L1757: /* Final correction v13: align Workers/Publicações titles with the same content start as
- L1800: /* Final media-section alignment lock v14
- L2125: /* INDEX RAIL ARROWS FINAL PARITY v19
- L2130: --home-rail-arrow-size-final: 48px;
- L2131: --home-rail-arrow-gutter-final: 64px;

## Plano de limpeza seguro para o index

1. Não remover imports do `index.html` de uma vez.
2. Congelar screenshot de desktop e mobile do index.
3. Separar `home.css` por domínio: hero/search, categorias, anúncios, workers, publicações, mais anúncios, mobile.
4. Mover apenas contratos reutilizáveis para `components` ou `patterns`; deixar layout específico em `pages/home.css`.
5. Remover blocos finais/repair/override apenas depois que o contrato equivalente estiver ativo e validado.
6. Não criar novos arquivos `final`, `fix`, `stage`, `hotfix` ou `redesign`.
7. Não adicionar `!important`; toda remoção deve preservar o visual aprovado.

## Próximo corte recomendado

Começar pelos blocos de maior reaproveitamento e menor risco: `workers`, `publicações`, `section headers` e `cards de anúncio`. Evitar mexer primeiro no shell/topbar ou no mobile geral do index.
