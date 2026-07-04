# Orders write staging executor

## Objetivo

Executar manualmente o canary real de escrita de pedidos em ambiente `local` ou `staging`, depois que o preflight aprovar `orders_write_canary_ready_for_manual_staging_execution`.

Este executor é propositalmente conservador: ele não é chamado pelo frontend, não altera o padrão visual, não muda HTML/CSS e mantém `dataProvider=mock` com `writeActivation=false`.

## Contrato

```txt
ordersProvider=api-write-canary-staging-execution
dataProvider=mock
writeActivation=false
```

Status final esperado após execução real aprovada:

```txt
orders_write_canary_staging_execution_validated
```

## Comandos

```bash
npm run audit:orders-write-canary-staging-executor
npm run execute:orders-write-canary:staging:dry-run
npm run execute:orders-write-canary:staging:check-env
```

Execução real somente com confirmação manual:

```bash
DOKE_ENVIRONMENT=staging \
DOKE_ORDERS_WRITE_CANARY_STAGING_API_URL=https://staging-api.example \
DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_NETWORK=1 \
DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_MUTATIONS=1 \
DOKE_ORDERS_WRITE_CANARY_STAGING_EXECUTE=1 \
npm run execute:orders-write-canary:staging:report
```

## Requisitos obrigatórios

- relatório de preflight com `orders_write_canary_ready_for_manual_staging_execution`;
- URL local/staging segura;
- flags explícitas para rede, mutação e execução;
- `x-idempotency-key` em toda mutação;
- replay seguro para mesmo payload;
- rollback documentado para `dataProvider=mock`.

## Rollback

Rollback frontend obrigatório:

```txt
ordersProvider=mock
dataProvider=mock
orderWriteActivation=false
```

Rollback de dados deve remover apenas registros canary criados nesta execução ou usar seeds/reset de staging.
