# Mobile/tablet repair — index.html — 2026-05-20

## Escopo
Correção pontual do estado híbrido do `index.html` em tablet estreito (`561px–760px`).

## Problema observado
Em viewports como `575px` e `617px`, o `mobile-app-shell.js` monta o shell mobile, mas o CSS de tablet da home reexibe estruturas antigas da página:

- `.home-index-topbar`
- `.topbar.topbar--location.internal-page-topbar`
- `.app-header.home-side-meta`
- `.home-side-meta`

Isso cria duplicação de chrome, excesso de offset vertical e sensação de conteúdo quebrado/cortado.

## Correção objetiva
Adicionado um guard no final de `assets/css/pages/home-tablet.css` para que, quando o shell mobile estiver ativo em `561px–760px`, apenas o shell mobile seja dono do chrome da página inicial.

Também foi removido o `padding-top` extra de `.page__content` nesse estado, porque a reserva de espaço já vem do próprio mobile shell.

## Arquivos alterados
- `assets/css/pages/home-tablet.css`
- `docs/mobile-tablet-index-repair-2026-05-20.md`

## Não alterado
- Nenhum HTML.
- Nenhum JS.
- Nenhum componente global.
- Nenhum layout desktop.
- Nenhuma cor, card, botão ou espaçamento desktop.

## Critérios de aceite
- Em `575px` e `617px`, não deve aparecer mobile shell + topbar/app-header antigos ao mesmo tempo.
- A página inicial não deve ter faixa duplicada de ações abaixo da busca mobile.
- O conteúdo não deve ser empurrado para baixo por padding de header antigo.
- Desktop permanece sob o contrato existente.
