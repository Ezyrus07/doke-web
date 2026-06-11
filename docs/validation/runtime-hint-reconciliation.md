# Stage 60 — Runtime Hint Reconciliation

## Objetivo

Reconciliar os CSS citados por runtime JS com os manifestos ativos antes de qualquer remoção física.

## Arquivo de produção alterado

- `assets/js/core/app.js`

## Decisão

Os hints de `INTERNAL_VIEW_STYLE_HINTS` estavam apontando para CSS antigos ou específicos já encapsulados por manifestos. Eles foram atualizados para pré-carregar os entrypoints CSS reais carregados pelos HTMLs ativos.

## Resultado mensurável

- `active_html_files`: **21**
- `physical_css_files`: **411**
- `unique_direct_css_entrypoints`: **22**
- `reachable_css_files`: **277**
- `reachable_imported_css_files`: **255**
- `not_reachable_css_files`: **134**
- `runtime_explicit_not_reachable`: **0**
- `broken_html_css_links`: **0**
- `broken_css_imports`: **0**
- `css_brace_issues`: **0**
- `important_total_assets_css`: **51**
- `important_reachable_css`: **0**
- `important_not_reachable_css`: **51**
- `style_hint_entries`: **15**
- `style_hint_missing_files`: **0**
- `style_hint_not_reachable`: **0**

## CSS runtime não alcançável

- Nenhum.

## Hints CSS ativos depois da reconciliação

- `assets/css/pages/avaliacao-foundation.css`
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
- `assets/css/pages/pedidos-foundation.css`
- `assets/css/pages/profile-foundation.css`
- `assets/css/pages/search-results.css`

## Arquivos originalmente bloqueadores

- `assets/css/components/cards/worker-media-card.css`: deixou de ser hint de runtime; permanece fisicamente no repositório como candidato documental/dormente, sem remoção neste stage.
- `assets/css/pages/results/index.css`: deixou de ser hint de runtime; permanece fisicamente no repositório como candidato documental/dormente, sem remoção neste stage.

## Remoção física

Nenhuma.

## Próximo alvo recomendado

Stage 61 — First Dormant CSS Candidate Batch Plan: separar lote pequeno de candidatos fortes para remoção controlada, ainda com validação de HTML/CSS/JS antes de deletar.
