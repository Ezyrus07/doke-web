# Index tablet category preview

## Causa raiz

No tablet, a pista de categorias da home já era horizontal, mas os cards estavam pequenos o suficiente para exibir seis categorias inteiras dentro do trilho. Isso eliminava a percepção visual de continuidade, mesmo havendo mais categorias à direita.

## Autoridade alterada

- `assets/css/pages/home/tablet-safari-layout.css`

A responsabilidade é de layout específico da home em tablet. Não houve alteração em shell, header global, sidebar, roteador ou componentes globais.

## Alteração

- Mantido o espaçamento pós-header de tablet em `48px`.
- Aumentada a largura dos itens de categoria para `clamp(144px, 16vw, 160px)`.
- Ajustado o gap da pista de categorias para `16px`.
- Label da categoria passa a ocupar `100%` do item para acompanhar a nova largura.
- Atualizado o versionamento do CSS no `index.html` para evitar cache.

## Critério de aceite

Em tablet, a primeira tela deve mostrar categorias inteiras e uma prévia parcial da próxima categoria à direita, comunicando que o trilho é arrastável horizontalmente.
