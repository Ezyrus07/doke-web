# Stage 15 — Index mobile refinements

Escopo: `index.html` em mobile (`max-width: 560px`).

## Corrigido

- Hero/topbar mobile voltou para o azul oficial do design system (`--color-primary` / `--color-primary-strong`).
- Hero/topbar agora tem `border-radius` completo, inclusive no topo.
- Primeiros cards de anúncio voltaram a ser carrossel horizontal no mobile.
- Workers foram reorganizados em grade 2x2 no formato shorts.
- Antes x Depois foi reorganizado como carrossel horizontal.

## Segurança

- Não altera desktop.
- Não altera JS.
- Não muda HTML estrutural além de adicionar o CSS da etapa no `index.html`.
- Regras são escopadas em `body.home-index-shell` e `@media (max-width: 560px)`.
