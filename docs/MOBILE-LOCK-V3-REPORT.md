# Mobile Lock v3 — searchbar finish

## Objetivo
Fechar a diferença visual restante entre o input mobile do `index.html` e do `resultados.html` sem mexer novamente no shell inteiro.

## Decisão
Foi adicionada uma classe canônica explícita `doke-mobile-search` nos dois HTMLs. Assim, o contrato final do input não depende mais de aliases antigos como `home-search-hero__form` ou `results-searchbar__query`.

## Alterações
- `index.html`: adicionadas classes canônicas ao form, ícones, campo, input, microfone e filtro.
- `resultados.html`: adicionadas as mesmas classes canônicas ao bloco equivalente.
- `mobile-chrome-lock.css`: criado bloco v3 final carregado por último para travar geometria, grid, foco e alinhamento vertical.

## Critérios
- Placeholder/texto centralizado verticalmente.
- Filtro verde visível no `resultados.html`.
- Input do `resultados.html` com a mesma geometria do `index.html`.
- Sem borda azul ao focar.
- Sem reabrir o problema das tabs azuis.
