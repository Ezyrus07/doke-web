# Relatório — Header/Scroll v5

## Alterações aplicadas

- `comunidade.html` agora usa o bloco `.home-side-meta` como header desktop visual, removendo a duplicação entre uma topbar vazia/só com lupa e a linha de ações da comunidade.
- O header desktop das páginas foi aproximado do topo via contrato global, reduzindo `--doke-app-topbar-height` para `78px` e ajustando o `padding` vertical da topbar.
- O scroll vertical foi consolidado no viewport (`html`) e wrappers internos de página foram impedidos de criar barras verticais próprias no desktop.
- A sidebar mantém rolagem funcional em telas baixas, mas sem exibir uma scrollbar visual paralela.

## Arquivo principal

- `assets/css/components/shell/doke-shell-contract.css`

## Cache atualizado

- `v=20260501-width-header-contract-v5`
