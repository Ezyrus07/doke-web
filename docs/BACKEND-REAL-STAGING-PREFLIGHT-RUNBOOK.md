# Backend Real Staging Preflight Runbook — Sprint 43–46

## Objetivo

Centralizar o gate operacional para preparar backend real completo do Doke em staging/local: Auth, Identity, Orders, Messaging, Notifications e Wallet.

Este runbook não autoriza produção. Ele bloqueia qualquer avanço sem ambiente seguro, relatórios reais e flags explícitas.

## Variáveis obrigatórias para execução real

```bash
DOKE_ENVIRONMENT=staging
DOKE_BACKEND_REAL_STAGING_API_URL=https://staging-api.example
DOKE_BACKEND_REAL_STAGING_ALLOW_NETWORK=1
DOKE_BACKEND_REAL_STAGING_ALLOW_MUTATIONS=1
```

Quando a URL não contiver marcador óbvio de `local`, `staging`, `stage`, `stg`, `preview`, `sandbox` ou `canary`, informe marcador explícito:

```bash
DOKE_BACKEND_REAL_STAGING_MARKER=staging
```

## Comandos

```bash
npm run audit:backend-real-staging-preflight-gate
npm run validate:backend-real:staging-preflight-gate:dry-run
npm run validate:backend-real:staging-preflight-gate:check-env
npm run validate:backend-real:staging-preflight-gate
npm run validate:backend-real:staging-preflight-gate:report
```

## Status esperado sem ambiente real

```txt
blocked_until_backend_real_staging_prerequisites
```

Esse bloqueio é correto: significa que o Doke não está fingindo aprovação de backend real sem relatórios.

## Status aprovado futuro

```txt
backend_real_ready_for_manual_staging_execution
```

Esse status libera apenas execução manual em staging/local. Produção continua fora de escopo.

## Relatórios exigidos

- `auth_identity_canary_ready_for_manual_staging_rollout`
- `orders_readonly_canary_ready_for_manual_write_canary_planning`
- `orders_write_canary_ready_for_manual_frontend_activation_planning`
- `orders_write_frontend_rollback_gate_validated`
- `backend_domain_canary_local_runtime_validated`

## Rollback

Rollback operacional padrão:

- manter `dataProvider=mock`;
- remover flags de canary;
- desligar `DOKE_BACKEND_REAL_STAGING_ALLOW_NETWORK`;
- desligar `DOKE_BACKEND_REAL_STAGING_ALLOW_MUTATIONS`;
- usar os runbooks específicos de Auth, Orders, Messaging, Notifications e Wallet.
