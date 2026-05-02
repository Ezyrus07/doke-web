# Doke — Correção v2 de largura e header

## Problema identificado
A primeira correção ainda deixava diferenças porque o projeto tinha contratos concorrentes:

- `--doke-shell-max-wide` usava 1360px em algumas páginas.
- `--doke-shell-max-default` usava 1220px em outras.
- `--doke-shell-max-narrow` usava 980px em páginas como configurações.
- Alguns wrappers internos criavam um segundo eixo horizontal dentro do conteúdo.

## Correção aplicada
Foi reforçado o contrato em `assets/css/components/shell/doke-shell-contract.css`.

Agora todos estes elementos usam o mesmo envelope:

- `.topbar`
- `.internal-page-topbar`
- `.page__content-inner`
- `.app-shell-page__workspace`
- `.shell-home__workspace`
- `.orders-shell-content`
- `.messages-shell-content`
- `.profile-shell-content`
- `.wallet-shell-content`
- `.settings-shell-content`
- `.search-results-workspace`

## Contrato final

- Sidebar desktop: `280px`
- Largura central: `1180px`
- Gutter lateral: `clamp(24px, 3vw, 40px)`
- Header e conteúdo compartilham o mesmo eixo horizontal
- Wrappers internos não podem recentralizar a página com outro `max-width`

## Arquivos afetados

- `assets/css/components/shell/doke-shell-contract.css`
- HTMLs principais tiveram apenas o cache busting atualizado para `v2`.
