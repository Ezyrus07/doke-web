# Relatório — Sidebar collapsed v12

## Correção
- Quando `body.sidebar-collapsed` está ativo no desktop, o App Shell agora troca a coluna do grid de `280px` para `96px`.
- A sidebar, o grid e a página principal passam a usar a mesma geometria.
- O item ativo do menu recolhido deixa de manter largura de menu aberto.
- Labels, badges e logo textual são ocultados sem reservar largura.
- A página principal não recebe mais `margin-left` legado ao recolher o menu.

## Arquivo principal
- `assets/css/components/shell/doke-shell-contract.css`

## Cache
- `v=20260501-width-header-contract-v12`
