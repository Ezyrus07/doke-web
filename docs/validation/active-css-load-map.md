# Stage 59 — Active CSS Load Map / Orphan Candidate Audit

## Objetivo
Mapear CSS ativo, CSS alcançável por `@import`, CSS citado dinamicamente e candidatos dormentes antes de qualquer remoção física.

## Escopo
- HTML ativo: arquivos `.html` fora de `archive/`, `reports/`, `tools/`, `test-results/`, `.git/` e `node_modules/`.
- CSS físico analisado: `assets/css/**/*.css`.
- JS/string scan: arquivos `.js` e `.html` ativos, sem scripts de auditoria.
- Remoção física: **nenhuma**.

## Resultado mensurável
- `active_html_files`: **21**
- `physical_css_files`: **411**
- `unique_direct_css_entrypoints`: **22**
- `reachable_css_files`: **277**
- `reachable_imported_css_files`: **255**
- `not_reachable_css_files`: **134**
- `runtime_explicit_not_reachable`: **2**
- `tooling_or_docs_only_not_reachable`: **132**
- `unreferenced_not_reachable`: **0**
- `broken_html_css_links`: **0**
- `broken_css_imports`: **0**
- `css_brace_issues`: **0**
- `important_total_assets_css`: **51**
- `important_reachable_css`: **0**
- `important_not_reachable_css`: **51**

## CSS direto por HTML ativo
| HTML | CSS diretos |
|---|---:|
| `ajuda.html` | 1 |
| `anunciar-servico.html` | 1 |
| `auth/cadastro.html` | 1 |
| `auth/esqueci-senha.html` | 1 |
| `auth/login.html` | 1 |
| `avaliacao-profissional.html` | 1 |
| `avaliacao.html` | 1 |
| `carteira.html` | 1 |
| `comunidade-interna.html` | 1 |
| `comunidade.html` | 3 |
| `configuracoes.html` | 1 |
| `detalhe-anuncio.html` | 1 |
| `index.html` | 1 |
| `mensagens.html` | 1 |
| `notificacoes.html` | 1 |
| `novidades.html` | 1 |
| `pagamento-profissional.html` | 1 |
| `pedidos.html` | 1 |
| `perfil.html` | 1 |
| `resultados.html` | 2 |
| `tornar-profissional.html` | 1 |

## Entry points CSS diretos únicos
- `assets/css/pages/ajuda-foundation.css`
- `assets/css/pages/anunciar-servico-foundation.css`
- `assets/css/pages/auth-foundation.css`
- `assets/css/pages/avaliacao-foundation.css`
- `assets/css/pages/avaliacao-profissional-foundation.css`
- `assets/css/pages/carteira-foundation.css`
- `assets/css/pages/comunidade-foundation.css`
- `assets/css/pages/comunidade-interna-foundation.css`
- `assets/css/pages/comunidade-post-shell-foundation.css`
- `assets/css/pages/comunidade-ui-foundation.css`
- `assets/css/pages/configuracoes-foundation.css`
- `assets/css/pages/home-foundation.css`
- `assets/css/pages/marketplace-detail-foundation.css`
- `assets/css/pages/marketplace-foundation.css`
- `assets/css/pages/messaging-foundation.css`
- `assets/css/pages/notificacoes-foundation.css`
- `assets/css/pages/novidades-foundation.css`
- `assets/css/pages/pagamento-profissional-foundation.css`
- `assets/css/pages/pedidos-foundation.css`
- `assets/css/pages/profile-foundation.css`
- `assets/css/pages/search-results.css`
- `assets/css/pages/tornar-profissional-foundation.css`

## Arquivos não alcançáveis mas citados por JS/runtime
Esses arquivos **não devem ser deletados** no próximo lote sem reconciliação, porque aparecem em hints/carregamento dinâmico.
- `assets/css/components/cards/worker-media-card.css` — citado por `assets/js/core/app.js`
- `assets/css/pages/results/index.css` — citado por `assets/js/core/app.js`

## Candidatos dormentes
- Candidatos não alcançáveis citados apenas por documentação/tooling/strings não-runtime: **132**.
- Candidatos não alcançáveis sem referência textual explícita encontrada: **0**.

### Distribuição dos não alcançáveis por grupo
| Grupo | Quantidade |
|---|---:|
| `assets/css/components/avatar.css` | 1 |
| `assets/css/components/base` | 7 |
| `assets/css/components/before-after-workers-preview` | 2 |
| `assets/css/components/buttons.css` | 1 |
| `assets/css/components/cards` | 5 |
| `assets/css/components/domain` | 1 |
| `assets/css/components/internal` | 3 |
| `assets/css/components/layout` | 6 |
| `assets/css/components/metrics.css` | 1 |
| `assets/css/components/navigation` | 12 |
| `assets/css/components/profile` | 3 |
| `assets/css/components/shell` | 18 |
| `assets/css/components/tabs.css` | 1 |
| `assets/css/components/toolbars.css` | 1 |
| `assets/css/components/ui.css` | 1 |
| `assets/css/core/border-consolidation.css` | 1 |
| `assets/css/core/layout` | 1 |
| `assets/css/core/layout-responsive.css` | 1 |
| `assets/css/core/layout-shell.css` | 1 |
| `assets/css/core/layout-topbar.css` | 1 |
| `assets/css/core/patterns.css` | 1 |
| `assets/css/core/primitives.css` | 1 |
| `assets/css/core/shell-home.css` | 1 |
| `assets/css/core/surface-normalize.css` | 1 |
| `assets/css/core/surfaces.css` | 1 |
| `assets/css/pages/app-shell-polish.css` | 1 |
| `assets/css/pages/configuracoes` | 3 |
| `assets/css/pages/detalhe-anuncio` | 16 |
| `assets/css/pages/home` | 20 |
| `assets/css/pages/home-refresh` | 1 |
| `assets/css/pages/home-tablet-v2.css` | 1 |
| `assets/css/pages/notificacoes` | 1 |
| `assets/css/pages/orders-hero.css` | 1 |
| `assets/css/pages/perfil` | 4 |
| `assets/css/pages/perfil-reviews-page.css` | 1 |
| `assets/css/pages/results` | 1 |
| `assets/css/pages/search-results` | 3 |
| `assets/css/pages/shell-normalize.css` | 1 |
| `assets/css/pages/sidebar-unified.css` | 1 |
| `assets/css/patterns/ad-process-steps.css` | 1 |
| `assets/css/patterns/community-room-layout.css` | 1 |
| `assets/css/patterns/home-media-rails.css` | 1 |
| `assets/css/patterns/marketplace-responsive-stack.css` | 1 |
| `assets/css/patterns/mobile-app-shell.css` | 1 |
| `assets/css/patterns/page-responsive-contract.css` | 1 |

## `!important`
- `!important` alcançável pela cascata ativa: **0**.
- `!important` em CSS físico dormente/não alcançável: **51**.

### Arquivos dormentes com `!important`
- `assets/css/components/cards/mobile-card-contract.css`
- `assets/css/components/cards/shared-index-card-contract.css`
- `assets/css/components/domain/doke-domain-cards.css`
- `assets/css/components/layout/index-compact-card-contract.css`
- `assets/css/components/layout/professional-responsive-layout.css`
- `assets/css/components/layout/responsive-page-contract.css`
- `assets/css/components/layout/responsive-priority-cards.css`
- `assets/css/components/layout/responsive-priority-contract.css`
- `assets/css/components/navigation/app-mobile-header-contract.css`
- `assets/css/components/navigation/app-mobile-search.css`
- `assets/css/components/navigation/app-mobile-topbar.css`
- `assets/css/components/navigation/home-mobile-drawer.css`
- `assets/css/components/navigation/mobile-chrome-lock.css`
- `assets/css/components/navigation/mobile-page-rhythm-contract.css`
- `assets/css/components/navigation/mobile-search-header-shared.css`
- `assets/css/components/shell/app-header-canonical-contract.css`
- `assets/css/components/shell/app-header.css`
- `assets/css/components/shell/doke-shell-contract.css`
- `assets/css/components/shell/header-rail-alignment-contract.css`
- `assets/css/components/shell/ipad-safari-scroll-rescue.css`
- `assets/css/components/shell/ipad-safari-scroll.css`
- `assets/css/components/shell/marketplace-page-contract.css`
- `assets/css/components/shell/mobile-app-shell.css`
- `assets/css/components/shell/mobile-base-stability.css`
- `assets/css/components/shell/page-container-contract.css`
- `assets/css/components/shell/responsive-boundary.css`
- `assets/css/components/shell/tablet-app-parity.css`
- `assets/css/components/shell/tablet-internal-rail-contract.css`
- `assets/css/components/shell/tablet-shell-contract.css`
- `assets/css/pages/app-shell-polish.css`
- `assets/css/pages/home-tablet-v2.css`
- `assets/css/pages/home/chrome.css`
- `assets/css/pages/home/footer.css`
- `assets/css/pages/home/mobile-alignment.css`
- `assets/css/pages/home/mobile-composition.css`
- `assets/css/pages/home/mobile-feed-rails.css`
- `assets/css/pages/home/mobile-hero-feed.css`
- `assets/css/pages/home/mobile-interactions.css`
- `assets/css/pages/home/mobile-layout.css`
- `assets/css/pages/home/sections.css`
- `assets/css/pages/home/tablet-responsive-layout.css`
- `assets/css/pages/home/tablet-safari-layout.css`
- `assets/css/pages/home/tablet-shell-rail.css`
- `assets/css/pages/perfil/mobile-public-profile.css`
- `assets/css/pages/perfil/tablet-portrait-contract.css`
- `assets/css/pages/search-results/mobile-card-contract.css`
- `assets/css/pages/search-results/mobile-density.css`
- `assets/css/pages/search-results/mobile-layout-contract.css`
- `assets/css/pages/shell-normalize.css`
- `assets/css/patterns/community-room-layout.css`
- `assets/css/patterns/marketplace-responsive-stack.css`

## Decisão
Não remover arquivos no Stage 59. O próximo stage deve reconciliar os dois CSS citados por runtime JS e só depois separar um primeiro lote pequeno de remoção segura.

## Próximo alvo recomendado
**Stage 60 — Runtime Hint Reconciliation**

Arquivos a inspecionar antes de qualquer deleção:
- `assets/css/components/cards/worker-media-card.css`
- `assets/css/pages/results/index.css`
