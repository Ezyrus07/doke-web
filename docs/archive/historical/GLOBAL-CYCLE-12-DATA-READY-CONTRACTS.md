# Ciclo Global 12 — Data-ready contracts

## Objetivo

Preparar a base do Doke para a migração progressiva de conteúdo mockado em HTML para dados reais via JS, serviços e backend.

## Alterações

- Criado `docs/DATA-READY-CONTRACTS.md`.
- Criado `assets/js/core/data-rendering.js`.
- Criado `assets/js/components/renderers/card-renderers.js`.
- Criado `assets/js/components/renderers/README.md`.
- Criada auditoria `scripts/audit-data-ready-contracts.js`.
- Adicionado comando `npm run audit:data-ready`.

## Decisão arquitetural

Este ciclo não altera visual e não migra páginas inteiras. Ele cria uma fundação segura para que, nos próximos ciclos, cards, listas, workers, publicações, avaliações, pedidos e carteira possam receber dados reais sem refatoração radical.

## Próximo passo recomendado

Ciclo Global 13 — search/input/section-header ownership, mantendo a nova regra: qualquer bloco que será renderizado por dados deve receber hooks previsíveis e estados de lista quando for tocado.
