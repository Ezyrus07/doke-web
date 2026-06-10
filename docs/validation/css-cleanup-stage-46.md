# CSS Cleanup Stage 46

Escopo: `novidades.html`, `ajuda.html` e `anunciar-servico.html`.

## Objetivo

Remover dependências diretas de contratos antigos de shell/header/rail/tablet/mobile em páginas internas simples, preservando apenas a base necessária da nova estrutura.

## Páginas saneadas

- `novidades.html`
- `ajuda.html`
- `anunciar-servico.html`

## Nova base mantida

- `assets/css/core/index.css`
- `assets/css/pages/app-shell.css`
- `assets/css/pages/internal-shell.css`
- `assets/css/layout/header.css`
- `assets/css/components/ui/doke-ui-system.css`
- `assets/css/components/flows/doke-product-flows.css`
- `assets/css/components/help/help-drawer.css`
- CSS específico da página

## Resultado por página

| Página | CSS direto | CSS transitivo | !important ativo |
|---|---:|---:|---:|
| `novidades.html` | 8 | 12 | 0 |
| `ajuda.html` | 8 | 12 | 0 |
| `anunciar-servico.html` | 8 | 12 | 0 |

## Resultado global

- `!important` total restante em `assets/css`: 10629
- CSS com chaves desbalanceadas: 0

## Risco

Alto risco visual localizado nessas páginas: header, container, drawer, formulários, help drawer e responsivo. Esta etapa prioriza previsibilidade estrutural sobre acabamento visual.
