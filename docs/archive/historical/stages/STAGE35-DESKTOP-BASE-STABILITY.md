# Stage 35 — Desktop Base Stability

## Objetivo

Estabilizar a base desktop sem interferir no mobile. Esta etapa não muda o design final; protege estrutura, sidebar, topbar, busca, grids, cards e largura de conteúdo contra regressões.

## Arquivo principal

```txt
assets/css/components/shell/desktop-base-stability.css
```

## Regras aplicadas

- Contrato restrito a `@media (min-width: 761px)`.
- Sidebar desktop fica no trilho esquerdo com sticky apenas no desktop.
- Topbar desktop mantém flex sem quebrar linha por acidente.
- Input desktop/topbar search permanece visível e interativo.
- Cards, grids, mídia e conteúdo recebem proteção contra estouro horizontal.
- Elementos mobile continuam escondidos no desktop.

## Próximo passo

Stage 36 — Mobile Base Stability.
