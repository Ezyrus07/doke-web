# Stage 4 — Auditoria responsiva por página

Data: 2026-05-02
Base: `dokee-web-stage3-search-filter-full.zip`

## Objetivo

Revisar `index.html`, `resultados.html`, `mensagens.html` e `perfil.html` com foco em encaixe responsivo, overflow, grids e cards, sem criar correções locais por print e sem tocar no shell global.

## Diagnóstico técnico

1. `home.css` e `search-results.css` ainda tinham `@import` de `search-filter-contract.css` no final do arquivo. Em CSS, `@import` depois de regras normais não é confiável e pode ser ignorado pelo navegador. O contrato de busca/filtros foi movido para a área válida de imports.
2. Os cards tinham proteção global inicial, mas ainda faltava um contrato de página para evitar: texto vertical, grid estreito demais, footer/CTA invadindo conteúdo e tags estourando em mobile.
3. `resultados.html` precisava de proteção responsiva no `results-layout`, `results-grid`, summary e filtros para evitar layout comprimido.
4. `mensagens.html` precisava preservar o shell e manter a composição interna sem overflow horizontal, principalmente na lista lateral e no thread.
5. `perfil.html` precisava de reforço em métricas/reviews para impedir labels quebrando de forma vertical em telas pequenas.

## Implementação

### Novo contrato compartilhado

Criado:

- `assets/css/components/layout/responsive-page-contract.css`

Responsabilidade:

- guard rails de overflow;
- grid responsivo de cards;
- proteção de textos longos;
- line-clamp para títulos;
- normalização de tags/footer/CTA;
- ajustes pontuais para `home`, `resultados`, `mensagens` e `perfil`, sempre escopados por classe do body.

### Páginas conectadas

Atualizados:

- `index.html`
- `resultados.html`
- `mensagens.html`
- `perfil.html`

O novo contrato é carregado depois dos contratos de shell/componentes para funcionar como camada final de composição por página, sem alterar o shell global.

### Imports corrigidos

Atualizados:

- `assets/css/pages/home.css`
- `assets/css/pages/search-results.css`

O `search-filter-contract.css` saiu do fim inválido e entrou antes das regras normais.

## Critérios de aceite

- Nenhuma página deve gerar overflow horizontal em mobile.
- Cards de serviço/resultado não devem quebrar texto letra por letra.
- Tags, preço, rating e CTA não devem se sobrepor no mobile.
- `resultados.html` deve cair para layout de uma coluna em tablet/mobile.
- `mensagens.html` deve manter shell, coluna azul e thread encaixados, sem sumir sidebar global.
- Métricas/reviews do perfil devem manter labels legíveis.

## Limites

Não foi feita migração para framework, não foi refeito o design e não houve alteração em `body`, shell global, sidebar ou header global para resolver problema específico de página.
