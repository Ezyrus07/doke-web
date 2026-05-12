# Ciclo Global 27 — Media/review data hooks

## Objetivo

Preparar Workers, publicações e avaliações para renderização futura por JS/backend sem alterar visual aprovado e sem consolidar telas provisórias como contrato definitivo.

## O que foi criado

- `assets/js/renderers/worker-card-renderer.js`
- `assets/js/renderers/publication-card-renderer.js`
- `assets/js/renderers/review-card-renderer.js`
- `scripts/audit-media-review-data-hooks.js`

## Contratos data-ready adicionados

### Workers

Hooks principais:

- `data-worker-card`
- `data-card-kind="worker"`
- `data-worker-id`
- `data-worker-trigger`
- `data-worker-title`
- `data-worker-provider`
- `data-worker-category`
- `data-worker-duration`
- `data-worker-views`
- `data-worker-likes`
- `data-worker-poster`
- `data-worker-preview`

### Publicações

Hooks principais:

- `data-publication-card`
- `data-card-kind="publication"`
- `data-publication-id`
- `data-publication-type-value`
- `data-publication-author-id`
- `data-publication-media`
- `data-publication-image`
- `data-publication-preview`
- `data-publication-title`
- `data-publication-author`
- `data-publication-description`
- `data-publication-actions`

### Avaliações

Hooks principais:

- `data-review-card`
- `data-card-kind="review"`
- `data-review-id`
- `data-review-service-id`
- `data-review-author-id`
- `data-review-avatar`
- `data-review-author`
- `data-review-subtitle`
- `data-review-text`
- `data-review-service-title`
- `data-review-date`
- `data-rating-value`

## Regras preservadas

- Nenhuma alteração visual intencional.
- Nenhum `!important` novo.
- Nenhum `style=""` em HTML.
- Nenhum arquivo `fix`, `hotfix`, `stage`, `final` ou `novo`.
- Renderers não buscam dados diretamente.
- Renderers não acessam Supabase, Firebase, storage ou `fetch`.

## Próximo ciclo recomendado

Ciclo Global 28 — mock data boundaries, criando ou consolidando mocks de services/workers/publications/reviews para separar exemplos estáticos de estrutura visual.
