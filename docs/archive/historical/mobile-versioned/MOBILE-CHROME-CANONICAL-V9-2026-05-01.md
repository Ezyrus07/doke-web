# Mobile chrome canonical v9

Correção estrutural para desfazer o efeito colateral da v8.

## Decisão
- Recriar `mobile-search-header-shared.css` como contrato único e pequeno.
- Não usar `100vw`/`100dvw` no shell da página, pois isso pode gerar sobra lateral em mobile/devtools.
- Usar `width: 100%`, `max-width: 100%`, `overflow-x: hidden` nos shells e largura controlada por `calc(100% - gutter)` nos componentes.
- Manter `resultado.html` consumindo o mesmo padrão visual do `index.html`, sem tabs azuis no mobile.

## Arquivos alterados
- `index.html`
- `resultados.html`
- `assets/css/components/navigation/mobile-search-header-shared.css`
