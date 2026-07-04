# Orders write frontend rollback gate

## Objetivo

Validar rollback e degradação segura para a ativação manual de escrita de pedidos no frontend.

O gate garante que a ativação manual pode ser revertida sem corromper o estado anterior do navegador e sem deixar `ordersProvider` ativo em API.

## Contrato de rollback

```txt
ordersProvider=mock
dataProvider=mock
orderWriteActivation=false
ordersWriteCanary=false
```

Status aprovado:

```txt
orders_write_frontend_rollback_gate_validated
```

## Comandos

```bash
npm run audit:orders-write-frontend-rollback-gate
npm run validate:orders-write-frontend-rollback:gate:dry-run
npm run validate:orders-write-frontend-rollback:gate
npm run validate:orders-write-frontend-rollback:gate:report
```

## Degradação segura

O canary deve ficar bloqueado quando:

- `window.fetch` não existir;
- `enableNetworkRequests` estiver desligado;
- a URL não estiver marcada como local/staging;
- `dataProvider` não estiver em `mock`;
- `orderWriteActivation=false`.

## Rollback manual

```js
Doke.services.orders.rollbackOrdersWriteCanary();
location.reload();
```

O rollback deve restaurar valores prévios de `localStorage` quando existirem. Se não houver backup, deve limpar o canary e voltar para `ordersProvider=mock` com `orderWriteActivation=false`.
