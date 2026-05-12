# Ciclo Global 37 — Pedidos data controller

## Objetivo
Preparar `pedidos.html` para dados reais/scripts sem alterar visual, CSS ou comportamento aprovado.

## Escopo
- Adicionar hooks data-ready mínimos em `pedidos.html`.
- Criar controller leve para buscar dados pelo `page-data-orchestrator`.
- Adicionar mock de pedidos em fronteira separada de dados.
- Ensinar o `mock-repository-provider` a retornar dados de `pedidos`.

## Arquivos principais
- `pedidos.html`
- `assets/js/pages/pedidos-data-controller.js`
- `assets/data/mocks/operations/orders.json`
- `assets/js/services/mock-data-boundary.js`
- `assets/js/services/mock-repository-provider.js`
- `scripts/audit-pedidos-data-controller.js`

## Decisão técnica
O controller não renderiza cards e não substitui o controller legado de pedidos. Ele apenas prepara estado e emite eventos:

- `doke:orders-data-ready`
- `doke:orders-data-error`
- `doke:orders-data-unavailable`

Isso preserva a tela atual e evita acoplar o HTML provisório ao backend futuro.

## Critérios de aceite
- Sem alteração visual intencional.
- Sem `!important` novo.
- Sem `style=""` novo.
- Sem arquivo `fix/hotfix/stage/final`.
- Dados passam pela fronteira `repositoryBoundary/pageDataOrchestrator`.
