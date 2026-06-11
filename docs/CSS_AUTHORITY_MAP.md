# CSS Authority Map — Doke

Este mapa define autoridade antes de novas correções visuais. Ele deve ser usado para evitar cascata, duplicação e remendos.

## Autoridades

| Área | Dono permitido | Proibido em |
|---|---|---|
| Tokens, reset, tipografia base | `assets/css/core` | `pages` |
| Rail/largura global | `core/layout` ou contrato global existente | CSS de página sem escopo |
| Header compartilhado | `assets/css/layout/header.css` | páginas isoladas, `components/shell` e patterns criando anatomia concorrente |
| Shell, sidebar, bottom-nav | `components/shell` / `patterns/navigation` | páginas isoladas |
| Cards de anúncio | `components/cards/ad-card.css` e contrato card compartilhado | `pages/*` alterando anatomia |
| Workers/vídeos | `components/cards/worker-card.css` ou pattern canônico | `pages/home` alterando anatomia |
| Publicações | `components/cards/publication-card.css` | `pages/*` alterando mídia/body/footer |
| Botões | `components/buttons` | CSS por página duplicando estilo |
| Inputs/busca | `components/forms`/`components/search` | CSS local duplicado |
| Modais | `components/modals` | CSS local por modal |
| Layout específico da página | `pages/<page>` | componentes internos |

## Regra de fronteira

CSS de página pode controlar: `display`, `grid-template-columns`, `gap`, `overflow`, `margin-block`, `rail`, `max-width` da composição local.

CSS de página não pode controlar: `height`/`min-height` de mídia interna, `padding` interno, `border-radius`, `box-shadow`, tipografia interna, CTA, tags, badges, footer e avatar de componentes compartilhados.

## Processo obrigatório

1. Encontrar regra vencedora no DevTools/Computed.
2. Classificar a regra como componente, pattern, core ou page.
3. Remover/consolidar conflito antes de adicionar regra nova.
4. Validar primeiro paint, `DOMContentLoaded` e `load`.
5. Registrar riscos e arquivos alterados.
