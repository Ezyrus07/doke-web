# Index tablet publications rail

## Causa raiz

No tablet, a seção `home-publications` ainda podia obedecer a regras antigas de grid de duas colunas com `!important` e seletor mais específico que o contrato horizontal criado depois. Isso fazia o terceiro card quebrar para a linha de baixo em vez de aparecer como prévia lateral.

## Correção

Ajustado o contrato existente em `assets/css/pages/home/tablet-safari-layout.css`, sem criar arquivo novo, para que `#home-publications-track` seja uma pista horizontal real em tablet:

- `.content-rail.home-media-rail--publications` passa a ser o container de scroll horizontal.
- `#home-publications-track.publication-grid` usa `display:flex`, `flex-wrap:nowrap` e `width:max-content`.
- Os cards usam `clamp(318px, 32vw, 332px)` para exibir dois cards principais e uma prévia lateral do próximo.

## Escopo

Somente `index.html`/home em tablet. Não altera shell, header, sidebar, JS, desktop ou mobile.

## Arquivos alterados

- `index.html`
- `assets/css/pages/home/tablet-safari-layout.css`
