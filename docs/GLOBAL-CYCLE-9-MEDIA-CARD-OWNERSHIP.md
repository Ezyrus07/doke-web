# Ciclo Global 9 — Ownership de cards de mídia

## Objetivo

Separar responsabilidade entre **card reutilizável** e **layout de seção/rail da home**.

Este ciclo evita que `worker-card.css` e `publication-card.css` carreguem regras de posicionamento específicas do `index.html`. Assim, `resultados.html`, `perfil.html`, `detalhe-anuncio.html` e páginas futuras poderão reutilizar os cards sem herdar grid, trilho, setas ou espaçamento da home.

## Mudanças realizadas

### Novo pattern

Criado:

```txt
assets/css/patterns/home-media-rails.css
```

Responsabilidade:

```txt
- variáveis do rail de mídia da home
- seção Workers na home
- seção Publicações na home
- content-rail da home
- setas da home
- track horizontal de Workers
- grid/rail horizontal de Publicações
- responsividade desses rails no index.html
```

### Componentes ajustados

Arquivos ajustados:

```txt
assets/css/components/cards/worker-card.css
assets/css/components/cards/publication-card.css
```

Nova responsabilidade:

```txt
worker-card.css = visual e interação do card Worker
publication-card.css = visual e interação do card de publicação
home-media-rails.css = posicionamento dessas seções dentro da home
```

### Manifest da home

`assets/css/pages/home.css` agora importa o pattern antes dos cards de mídia:

```txt
assets/css/patterns/home-media-rails.css
assets/css/components/cards/publication-card.css
assets/css/components/cards/worker-card.css
```

## O que não foi feito

```txt
- não houve redesign do index.html
- não houve alteração de shell/sidebar/header/body
- não houve remoção em massa de CSS antigo
- não houve tentativa de remover todos os !important dos cards
- não houve consolidação visual definitiva de HTMLs ainda provisórios
```

## Risco controlado

A mudança foi feita preservando os seletores e valores principais que já existiam nos componentes. A diferença é apenas a camada responsável por cada regra.

## Critérios de aceite

```txt
- home mantém Workers e Publicações no mesmo posicionamento visual
- worker-card.css não possui mais regras de rail da home
- publication-card.css não possui mais regras de rail/grid da home
- home.css centraliza a composição da home por manifesto
- auditoria de ownership passa
- nenhum import quebrado
- nenhum !important novo
- nenhum style="" novo
```

## Próximo ciclo recomendado

Ciclo Global 10 — inventário de `service-card.css`, separando:

```txt
- service-card como componente visual
- service-grid/service-cards-grid como pattern/layout de página
- variações específicas da home/resultados/perfil em seus respectivos owners
```
