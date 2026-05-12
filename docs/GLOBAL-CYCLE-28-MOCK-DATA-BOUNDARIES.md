# Ciclo Global 28 — Mock data boundaries

## Foco

Separar dados de exemplo da estrutura visual, preparando o Doke para integração futura com scripts/backend.

## Arquivos criados

```txt
assets/data/mocks/marketplace/services.json
assets/data/mocks/marketplace/workers.json
assets/data/mocks/marketplace/publications.json
assets/data/mocks/marketplace/reviews.json
assets/data/mocks/marketplace/manifest.json
assets/data/mocks/marketplace/README.md
assets/js/services/mock-data-boundary.js
scripts/audit-mock-data-boundaries.js
docs/MOCK-DATA-BOUNDARIES.md
```

## Decisão técnica

Os mocks novos ficam isolados em `assets/data/mocks/marketplace`, sem alterar HTML ou visual aprovado.

Renderers continuam sendo responsáveis apenas por renderizar UI a partir de objetos. A camada `mock-data-boundary.js` carrega dados temporários e pode ser substituída por repositories/adapters no futuro.

## Critérios de aceite

- Nenhuma alteração visual intencional.
- Nenhum `!important` novo.
- Nenhum `style=""` novo.
- Nenhum arquivo `fix`, `hotfix`, `stage` ou `final` criado.
- Renderers não buscam dados diretamente.
- Mocks têm campos mínimos previsíveis para serviços, Workers, publicações e avaliações.
