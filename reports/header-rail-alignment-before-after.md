# Header rail alignment — before/after

Correção objetiva: alinhar `.app-header__inner` das páginas internas ao mesmo rail do conteúdo principal, sem alterar cor, copy, ícones ou hierarquia visual.

## Resumo desktop 1280x800

| Página | Antes header x | Antes conteúdo x | Depois header x | Depois conteúdo x | Δ depois |
|---|---:|---:|---:|---:|---:|
| `pedidos.html` | 358.4 | 328 | 328 | 328 | 0 |
| `notificacoes.html` | 358.4 | 328 | 328 | 328 | 0 |
| `comunidade.html` | 358.4 | 328 | 328 | 328 | 0 |
| `carteira.html` | 358.4 | 328 | 328 | 328 | 0 |
| `perfil.html` | 358.4 | 328 | 328 | 328 | 0 |
| `resultados.html` | 318.4 | 328 | 318.4 | 328 | -9.6 |

## Breakpoints medidos

- 608x926
- 810x1080
- 1024x768
- 1280x800

## Arquivos alterados

- `assets/css/components/shell/header-rail-alignment-contract.css`
- HTMLs principais: link do contrato no fim do `<head>`

## Observações

- `detalhe-anuncio.html` mantém conteúdo principal com layout próprio/full rail em algumas seções; o header foi alinhado ao rail interno compartilhado.
- `mensagens.html` possui workspace/chat próprio; o header não foi forçado a herdar o layout do marketplace para não quebrar a área de conversa.
- O teste principal existente `npm run test:responsive-contract` foi iniciado, mas o Playwright do ambiente encerrou durante `page.setContent`; a validação entregue foi feita pelo script customizado de bounding boxes usado neste ciclo.