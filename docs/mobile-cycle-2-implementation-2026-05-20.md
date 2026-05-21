# Mobile Cycle 2 — Comunidade e Pedidos

Data: 2026-05-20  
Escopo: `comunidade.html` e `pedidos.html`  
Tipo: correção responsiva controlada, sem redesign global.

## Objetivo

Avançar o mobile em páginas de risco médio antes de entrar nas páginas críticas (`index.html`, `perfil.html`, `detalhe-anuncio.html`, `mensagens.html` e `comunidade-interna.html`).

O ciclo não altera shell global, header, sidebar, bottom-nav, cores globais, tokens ou componentes compartilhados. As alterações ficaram restritas aos CSS de página já existentes.

## Arquivos alterados

| Arquivo | Motivo |
|---|---|
| `assets/css/pages/comunidade/mobile-layout-contract.css` | Corrigir colisão objetiva entre pill/categoria e título nos cards compactos de descoberta em mobile. |
| `assets/css/pages/pedidos/orders-command-center.css` | Corrigir clipping objetivo da lista de pedidos em tablet estreito, especialmente 768px. |
| `docs/mobile-cycle-2-implementation-2026-05-20.md` | Registro técnico do ciclo. |

## Correções aplicadas

### `comunidade.html`

Problema encontrado:
- Nos cards de descoberta em mobile, a `community-pill` herdava comportamento absoluto de uma camada posterior de CSS de foto/card.
- Isso fazia a categoria ficar sobreposta ao título em cards compactos.

Correção:
- A pill dos cards de descoberta volta para o fluxo do grid em `max-width: 760px`.
- Títulos e estatísticas recebem contenção de largura e overflow para evitar colisão em telas estreitas.

Responsabilidade arquitetural:
- Correção mantida em `assets/css/pages/comunidade/mobile-layout-contract.css`, porque é um ajuste específico do layout mobile da página de comunidade.
- Nenhum componente global foi alterado.

### `pedidos.html`

Problema encontrado:
- Em `768px`, a lista de pedidos tentava montar duas colunas mínimas de `280px` dentro de uma área útil menor.
- Resultado: o segundo card ficava parcialmente cortado no tablet estreito.

Correção:
- Entre `761px` e `920px`, a lista de pedidos passa a usar uma coluna fluida (`minmax(0, 1fr)`).
- Os cards mantêm `width: 100%` e `min-width: 0` para respeitar a largura do container.

Responsabilidade arquitetural:
- Correção mantida em `assets/css/pages/pedidos/orders-command-center.css`, porque o conflito vinha da camada de command center dos pedidos.
- Nenhum CSS global foi alterado.

## Validação executada

Viewports testados com Playwright:

| Página | 320x568 | 390x844 | 430x932 | 768x1024 | 1366x768 |
|---|---:|---:|---:|---:|---:|
| `comunidade.html` | 0px overflow | 0px overflow | 0px overflow | 0px overflow | 0px overflow |
| `pedidos.html` | 0px overflow | 0px overflow | 0px overflow | 0px overflow | 0px overflow |

Comandos/checagens:
- Playwright com `page.setContent()` e interceptação de assets locais.
- Medição de `documentElement.scrollWidth - window.innerWidth`.
- Captura antes/depois nas páginas afetadas.
- `git diff --check`.

Observação:
- O ambiente continua bloqueando navegação direta via `page.goto()` por política da sandbox. A validação usou o mesmo fallback do baseline: `page.setContent()` + assets locais.
- O erro de `localStorage` observado no Playwright vem do contexto opaco criado por `setContent()` e não foi tratado como bug do site.

## Critérios de aceite

- Sem overflow horizontal nas páginas testadas.
- Sem alteração de HTML.
- Sem alteração de JS.
- Sem alteração de shell/header/sidebar/bottom-nav.
- Correções restritas aos CSS de página.
- Desktop preservado em `1366x768` no escopo de layout medido.

## Próximo ciclo recomendado

Antes das páginas críticas, o próximo ciclo pode avançar para:

1. `carteira.html`
2. `perfil.html`

Motivo: as duas têm mais risco visual que `comunidade.html` e `pedidos.html`, mas ainda permitem atacar problemas de largura, cards e seções antes de encostar no fluxo mais sensível de chat/composer.
