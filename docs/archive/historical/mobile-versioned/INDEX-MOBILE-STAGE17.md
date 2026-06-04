# Stage 17 — Correção real do index mobile

Correção cirúrgica após o Stage 16 não surtir efeito visual suficiente em alguns ambientes.

## Escopo

- Apenas `index.html`.
- Apenas mobile/tablet pequeno via `@media (max-width: 760px)`.
- Não altera desktop.
- Não altera JS.

## Ajustes

1. Campo de busca do hero reduzido para 44–46px no mobile.
2. Rail de anúncios em destaque alinhada ao gutter da página, sem grudar no canto esquerdo.
3. Cards de anúncios em carrossel horizontal por ID real `#featured-services-track`.
4. Workers em grade 2x2 estilo shorts por ID real `#short-videos-track`.
5. Antes x Depois em carrossel horizontal por ID real `#before-after-track`.

## Observação técnica

Este arquivo deve ficar depois dos Stage 15/16 na cascata para vencer regras antigas de `home.css`, `home-results-card-stage4.css` e contratos globais.
