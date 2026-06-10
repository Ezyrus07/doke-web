# Validation Protocol — Doke Stabilization

## Viewports mínimos

- Mobile: `390x844`, `430x932`
- Tablet: `608x926`, `820x1180`, `1024x768`
- Desktop: `1366x768`, `1280x800`

## Páginas mínimas

- `index.html`
- `pedidos.html`
- `perfil.html`
- `mensagens.html`
- `notificacoes.html`
- `comunidade.html`
- `resultados.html`
- `detalhe-anuncio.html`
- `ajuda.html` quando shell/header/rail forem afetados

## Gates

1. Sem overflow horizontal.
2. Header alinhado ao rail/conteúdo.
3. Cards consistentes com `index.html`.
4. URL direta igual navegação interna.
5. Sem diferença entre primeiro paint, `DOMContentLoaded` e `load`.
6. `body[data-page]` correto após navegação interna.
7. Nenhum `!important` novo.
8. Nenhum arquivo com nome de remendo.

## Quando não validar visualmente

Declarar explicitamente: “não validado visualmente”. Não afirmar que está corrigido visualmente sem screenshot ou navegador real.
