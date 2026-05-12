# Doke — Contrato Global de Layout

## Objetivo

Garantir que as páginas do Doke compartilhem a mesma base de largura, shell e alinhamento antes de qualquer redesign específico.

## Contrato

- O shell global deve controlar sidebar, topbar, viewport e limites gerais.
- Páginas devem posicionar seu conteúdo dentro do container oficial do shell.
- Sticky lateral deve viver dentro do grid da página, nunca preso apenas ao primeiro bloco.
- Correções locais não devem alterar `body`, `.app-shell`, `.sidebar`, `.topbar` ou wrappers globais.

## Arquivos globais relevantes

- `assets/css/components/shell/responsive-boundary.css`
- `assets/css/components/shell/desktop-base-stability.css`
- `assets/css/components/shell/mobile-base-stability.css`
- `assets/css/components/shell/page-container-contract.css`
- `assets/css/components/layout/responsive-page-contract.css`

## Critérios de aceite

- Todas as páginas críticas carregam os contratos de shell/base exigidos pelas auditorias.
- O pipeline `audit:desktop-base`, `audit:responsive-boundaries` e `audit:desktop-shell` passa.
- Nenhum ajuste de página depende de alteração no shell global para resolver problema local.
