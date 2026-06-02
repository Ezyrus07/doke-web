# Index category rail — narrow desktop/zoom correction

## Causa raiz

Em desktop estreito ou com zoom do navegador, a largura CSS útil da home ficava fora do breakpoint `max-width: 1366px` do contrato tablet da home. Com isso, regras anteriores de categorias voltavam a distribuir os itens como uma linha de desktop (`space-between`/grade visual), deixando os cards muito afastados e fazendo a última categoria desaparecer do campo visível.

## Correção

A autoridade existente em `assets/css/pages/home/tablet-safari-layout.css` foi ampliada de `max-width: 1366px` para `max-width: 1680px`, cobrindo tablets, desktop estreito e desktop com zoom/sidebar. A correção mantém as categorias como rail horizontal estável com preview lateral, sem mexer em shell, sidebar, header ou JS.

## Arquivos alterados

- `index.html`
- `assets/css/pages/home/tablet-safari-layout.css`

## Observações

Não foi criado CSS novo. Não foram adicionadas novas regras com `!important`; apenas a faixa de aplicação do contrato existente foi corrigida para cobrir a condição real observada.
