# Orders write staging preflight runbook — Sprint 33

## Objetivo

A Sprint 33 prepara a execução real de escrita de pedidos em local/staging, mas não executa rede externa e não dispara mutações. O gate é um preflight operacional: ele valida se o ambiente, os relatórios anteriores, as flags e o alvo são seguros antes de qualquer operador tentar um canary real.

Contrato operacional:

```txt
writeActivation=false
dataProvider=mock
ordersProvider=api-write-canary-staging-preflight
performsNetworkRequest=false
performsMutation=false
```

Esse gate não ativa provider global de escrita no frontend e não deve ser usado como produção.

## Status possíveis

Sem relatórios reais ou sem ambiente completo, o status correto é:

```txt
blocked_until_orders_write_staging_preflight_prerequisites
```

Se a URL tiver aparência de produção ou não possuir marcador local/staging, o status correto é:

```txt
blocked_unsafe_orders_write_staging_target
```

Com todos os relatórios reais válidos e ambiente seguro, o status aprovado é:

```txt
orders_write_canary_ready_for_manual_staging_execution
```

Esse status autoriza apenas preparação manual de execução em staging. Ele não executa mutação e não ativa escrita por padrão.

## Comandos

```bash
npm run audit:orders-write-canary-staging-preflight-gate
npm run validate:orders-write-canary:staging-preflight-gate:dry-run
npm run validate:orders-write-canary:staging-preflight-gate:check-env
npm run validate:orders-write-canary:staging-preflight-gate
npm run validate:orders-write-canary:staging-preflight-gate:report
```

## Variáveis obrigatórias para liberar o preflight

```bash
DOKE_ENVIRONMENT=staging
DOKE_ORDERS_WRITE_CANARY_STAGING_API_URL=https://staging-api.example
DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_NETWORK=1
DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_MUTATIONS=1
```

Se a URL não contiver `local`, `localhost`, `127.0.0.1`, `staging`, `stage`, `stg`, `preview`, `sandbox`, `dev` ou `test`, defina um marcador explícito seguro:

```bash
DOKE_ORDERS_WRITE_CANARY_TARGET_MARKER=staging
```

Nunca use marcador `prod` ou `production`.

## Relatórios reais exigidos

O preflight exige relatórios reais anteriores, não dry-run:

```txt
reports/generated/auth-identity-canary-promotion-gate-report.json
reports/generated/orders-readonly-canary-promotion-gate-report.json
reports/generated/orders-write-canary-planning-gate-report.json
reports/generated/orders-write-canary-local-runtime-report.json
```

Status esperados:

```txt
auth_identity_canary_ready_for_manual_staging_rollout
orders_readonly_canary_ready_for_manual_write_canary_planning
orders_write_canary_ready_for_manual_contract_design
orders_write_canary_local_runtime_validated
```

O relatório local de escrita precisa preservar `writeActivation=false`, `dataProvider=mock` e evidenciar `DOKE_IDEMPOTENCY_CONFLICT`.

## Flags de falha fechada

Para transformar bloqueios em erro de CI/local:

```bash
DOKE_ORDERS_WRITE_CANARY_REQUIRE_STAGING_PREFLIGHT_READY=1 npm run validate:orders-write-canary:staging-preflight-gate
```

## Salvaguardas

O gate valida:

- `writeActivation=false`;
- `dataProvider=mock`;
- nenhuma rede externa no próprio preflight;
- nenhuma mutação no próprio preflight;
- URL de alvo com marcador local/staging;
- `DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_MUTATIONS=1` explícito;
- relatórios reais anteriores;
- idempotência obrigatória para cada mutação futura;
- rollback para mock antes e depois de qualquer tentativa real.

## Rollback

Antes de uma futura execução manual, registre o estado local e mantenha o caminho de retorno para:

```txt
writeActivation=false
dataProvider=mock
ordersProvider=mock
```

Se qualquer validação falhar, não execute canary real. Gere relatório de falha e mantenha pedidos em mock.

## Próximo passo

Depois que este gate retornar `orders_write_canary_ready_for_manual_staging_execution`, a próxima sprint pode preparar o executor real de staging. Esse executor ainda deve exigir confirmação manual, idempotency keys, relatório final e rollback imediato.
