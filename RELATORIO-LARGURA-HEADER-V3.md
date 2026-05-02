# Correção v3 — largura e header

## Diagnóstico
A v2 ainda deixava alguns HTMLs com largura diferente porque páginas internas carregavam contratos antigos com envelopes amplos (`wide/default/narrow`, 1360/1480px) e alguns seletores continuavam vencendo o comportamento visual em páginas como `pedidos.html`.

## Correção aplicada
- Mantido um único contrato global em `assets/css/components/shell/doke-shell-contract.css`.
- Atualizado o cache busting dos HTMLs para `v=20260501-width-header-contract-v3`.
- Adicionado um hard lock desktop usando a estrutura real:
  - `body[data-page] > .app-shell > .page > .topbar`
  - `body[data-page] > .app-shell > .page > .page__content > .page__content-inner`
- Header e conteúdo agora usam o mesmo envelope:
  - sidebar: `280px`
  - largura central: `1180px`
  - gutter lateral: `clamp(24px, 3vw, 40px)`
- Neutralizados os tokens antigos de largura:
  - `--doke-shell-max-wide`
  - `--doke-shell-max-default`
  - `--doke-shell-max-narrow`

## Arquivos HTML atualizados
- `index.html`
- `resultados.html`
- `pedidos.html`
- `comunidade.html`
- `perfil.html`
- `mensagens.html`
- `notificacoes.html`
- `carteira.html`
- `configuracoes.html`

## Regra técnica
CSS de página não deve mais controlar largura global, centralização do conteúdo ou geometria do header. Essas responsabilidades pertencem ao contrato global do shell.
