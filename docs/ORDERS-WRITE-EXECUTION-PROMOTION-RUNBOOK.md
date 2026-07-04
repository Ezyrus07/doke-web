# Orders write execution promotion gate

## Objetivo

Promover um relatório real de execução de escrita de pedidos para o próximo estágio: frontend activation planning.

Este gate não ativa escrita no frontend. Ele apenas valida que o relatório real contém `orders_write_canary_staging_execution_validated`, mutações esperadas, isolamento de domínio e prova de idempotência.

## Status

Bloqueado sem relatório real:

```txt
blocked_until_real_orders_write_staging_execution_report
```

Aprovado para planejamento manual:

```txt
orders_write_canary_ready_for_manual_frontend_activation_planning
```

## Comandos

```bash
npm run audit:orders-write-canary-execution-promotion-gate
npm run validate:orders-write-canary:execution-promotion-gate:dry-run
npm run validate:orders-write-canary:execution-promotion-gate
```

## Critérios

O relatório deve comprovar:

- `orders_write_canary_staging_execution_validated`;
- `dataProvider=mock`;
- `writeActivation=false`;
- mutações de `/orders` exercitadas;
- idempotency replay;
- nenhum domínio de mensagens, notificações, carteira, disputas, recibos ou admin.
