# Correção — cards de anúncio colapsando no iOS Safari

## Causa raiz

O contrato mobile da home usava `grid-auto-columns: clamp(164px, calc((100% - 14px) / 2), 214px)` junto com `width: max-content` para os trilhos de anúncios. No Safari real do iPhone, essa combinação pode gerar cálculo circular de largura: a coluna depende do tamanho do grid, enquanto o grid depende da soma das colunas. O resultado era o colapso visual dos cards em tiras verticais.

## Correção

O primeiro contrato mobile de `featured-services` e `more-services` foi convertido para `flex-flow: row nowrap`, com largura de card baseada em viewport via `clamp(286px, 82vw, 344px)`. Isso remove a dependência de porcentagem dentro de `max-content` e mantém o comportamento de carrossel horizontal com cards legíveis.

## Arquivos alterados

- `index.html`
- `assets/css/pages/home/mobile-index-feed-contract.css`

## Escopo

- Somente home/index em mobile.
- Não altera shell, header, sidebar ou roteador.
- Não cria arquivo novo.
- Não adiciona novo `!important`; apenas substitui um contrato legado que já usava `!important`.

## Validação recomendada

Testar em iPhone/Safari real:

1. Abrir `index.html`.
2. Rolar até `Destaques para você` e `Mais anúncios`.
3. Confirmar que os cards não viram tiras verticais.
4. Confirmar que o trilho horizontal mostra cards legíveis e prévia lateral.
