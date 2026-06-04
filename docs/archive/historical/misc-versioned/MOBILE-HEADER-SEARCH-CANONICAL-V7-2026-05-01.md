# Mobile header/search canonical contract v7

## Problema corrigido
O resultado mobile ainda podia parecer diferente do index por três motivos:

1. As abas `Serviços / Usuários / Workers` estavam funcionando visualmente como um segundo header azul no mobile.
2. A largura do shell mobile não estava travada em `100dvw`, o que gerava sobra lateral em telas maiores como iPhone 14.
3. Alguns estilos locais ainda podiam interferir na centralização vertical do input e no foco nativo do navegador.

## Decisão
- O topo mobile oficial continua sendo o padrão do `index.html`.
- `resultado.html` usa o mesmo contrato visual de header e busca.
- As abas de modo do resultado ficam ocultas no mobile para não virarem um header paralelo.
- O shell mobile passa a usar largura canônica baseada em `100dvw`, com gutter controlado por token.

## Arquivo responsável
`assets/css/components/navigation/mobile-search-header-shared.css`

Não adicionar correções locais de header/search em `assets/css/pages/search-results.css`.
