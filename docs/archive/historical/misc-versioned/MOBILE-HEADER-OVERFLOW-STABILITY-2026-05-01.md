# Mobile header/search stability patch — 2026-05-01

## Problema tratado
O `resultados.html` ainda podia mostrar estruturas antigas de cabeçalho mobile ou a barra segmentada azul acima da busca em alguns estados de carregamento/interação. Também havia risco de overflow horizontal em larguras próximas do iPhone 14.

## Decisão técnica
- O `resultados.html` não carrega mais `header-mobile.css`, porque esse arquivo é um contrato genérico antigo e podia disputar com o contrato específico `mobile-search-header-shared.css`.
- O bloco `.results-searchbar__query` agora vem antes de `.results-searchbar__modes` no DOM. Assim, mesmo antes do CSS terminar de carregar, o input aparece antes da segmentação e evita o “header azul” acima da busca.
- O contrato v6 centraliza `results-mobile-hero` e `results-searchbar` com largura baseada em `100dvw`, remove overflow horizontal e esconde qualquer topbar/header legado no mobile de resultados.

## Arquivos alterados
- `resultados.html`
- `index.html`
- `assets/css/components/navigation/mobile-search-header-shared.css`
- `docs/MOBILE-HEADER-OVERFLOW-STABILITY-2026-05-01.md`
