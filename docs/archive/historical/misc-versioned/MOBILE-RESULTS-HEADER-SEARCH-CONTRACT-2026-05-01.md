# Mobile Results Header/Search Contract — 2026-05-01

## Objetivo
Padronizar `resultados.html` mobile com a geometria visual do `index.html` para header, localização, notificação e campo de busca, sem copiar CSS local para a página.

## Arquivos alterados
- `resultados.html`
- `assets/css/components/navigation/mobile-search-header-shared.css`

## Decisões técnicas
- Removido carregamento duplicado antigo de `header-mobile.css` em `resultados.html`.
- Adicionado `bottom-nav.css` em `resultados.html`, alinhando o carregamento com o contrato global usado no `index.html`.
- Mantido o CSS de header/search dentro de `assets/css/components/navigation/mobile-search-header-shared.css`, porque header e busca são chrome global, não responsabilidade de `pages/search-results.css`.
- O seletor mobile final força `resultados.html` a usar a mesma largura, gutter, altura, radius, sombra, avatar e botões do padrão mobile do index.
- As tabs de modo de busca continuam existindo, mas ficam abaixo do input para não quebrar a hierarquia visual do topo.

## Regra de manutenção
Não redesenhar header, busca, localização, notificação ou bottom nav em CSS de página. Páginas devem consumir o contrato global e controlar apenas conteúdo específico.
