# Index tablet header/content gap

## Causa raiz
`index.html` tinha uma autoridade própria de ritmo vertical em tablet dentro de `assets/css/pages/home/tablet-safari-layout.css`, separada do contrato usado pelas páginas internas. O valor final aplicado para o espaço pós-header da home era menor que o ritmo visual observado em páginas como `pedidos.html`.

## Correção
Ajustado somente o token de página da home em tablet:

- `--index-tablet-content-top-gap: 36px` → `48px`

A alteração foi feita no arquivo de responsabilidade correta da home/tablet. Não houve alteração em shell global, sidebar, header canônico, JS, body ou wrappers globais.

## Arquivos alterados
- `index.html`
- `assets/css/pages/home/tablet-safari-layout.css`

## Validação
Validação estática executada:
- conferência de chaves CSS
- conferência de sintaxe JS do roteador
- audit desktop shell existente

Playwright runtime não foi executado neste ambiente.
