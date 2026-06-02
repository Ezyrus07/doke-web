# Index publications rail - small tablet consistency

## Causa raiz

A home ainda tinha um bloco de tablet portrait `561px–1024px` que forçava `#home-publications-track` para grid de duas colunas. Esse bloco afetava especialmente tablets menores/larguras próximas de 608px, antes das regras de `700px+` que já tratavam a seção como rail horizontal.

Resultado: em algumas telas as publicações apareciam como 2 cards em cima e 1 card abaixo, quebrando o padrão de carrossel horizontal aprovado para a home.

## Correção

Ajustado somente `assets/css/pages/home/tablet-safari-layout.css`, dentro da autoridade existente de home/tablet.

- A seção `home-publications` agora usa `content-rail` com overflow horizontal também no intervalo menor de tablet.
- O `#home-publications-track` passa a ser `flex` sem quebra de linha.
- Os cards usam largura clampada para mostrar cards principais e prévia lateral do próximo.
- Não houve alteração em shell, header, sidebar ou JavaScript.
- Não foi criado CSS novo.

## Validação recomendada

- `index.html` em 608x926
- `index.html` em 768x1024
- `index.html` em 820x1180
- `index.html` em 1280x832

Critérios:

- Publicações em destaque não podem quebrar para segunda linha.
- Deve existir scroll horizontal no rail.
- Deve aparecer prévia lateral do próximo card quando houver largura suficiente.
