# Orders write frontend activation planning gate

## Objetivo

Planejar a ativação futura de escrita de pedidos no frontend sem ligar nada por padrão.

Este gate depende do status `orders_write_canary_ready_for_manual_frontend_activation_planning` e mantém a ativação como desenho manual, não execução automática.

## Contrato

```txt
authProvider=api
dataProvider=mock
ordersProvider=api-write-canary-frontend-activation-planning
enableNetworkRequests=true
orderWriteActivationDefault=false
manualActivationOnly=true
```

Status aprovado:

```txt
orders_write_frontend_activation_ready_for_manual_contract_design
```

## Comandos

```bash
npm run audit:orders-write-frontend-activation-planning-gate
npm run validate:orders-write-frontend-activation:planning-gate:dry-run
npm run validate:orders-write-frontend-activation:planning-gate
```

## Guardrails

- `orderWriteActivationDefault=false`;
- `manualActivationOnly=true`;
- rollback imediato para mock;
- nenhuma ativação de mensagens, notificações, carteira ou admin;
- `idempotency-key` obrigatório em qualquer futura mutação;
- relatório obrigatório antes de expandir canary.

## Rollback

```txt
ordersProvider=mock
dataProvider=mock
orderWriteActivation=false
```
