# Backend Real Multidomain Staging Runbook

## Objetivo
Executar, manualmente e somente em `local`/`staging`, um smoke multi-domain real cobrindo Auth, Identity, Orders, Messaging, Notifications e Wallet.

## Regra de segurança
Este executor nunca deve rodar contra produção. Ele exige:

```bash
DOKE_ENVIRONMENT=staging
DOKE_BACKEND_REAL_STAGING_API_URL=https://staging-api.example
DOKE_BACKEND_REAL_STAGING_ALLOW_NETWORK=1
DOKE_BACKEND_REAL_STAGING_ALLOW_MUTATIONS=1
DOKE_BACKEND_REAL_STAGING_EXECUTE=1
DOKE_BACKEND_REAL_STAGING_CONFIRM=execute-backend-real-multidomain
```

## Comandos

```bash
npm run audit:backend-real-multidomain-staging-executor
npm run execute:backend-real:multidomain-staging:dry-run
npm run execute:backend-real:multidomain-staging:check-env
npm run execute:backend-real:multidomain-staging:report
```

## Pré-requisitos
- Auth/Identity real aprovado.
- Orders read-only real aprovado.
- Orders write staging aprovado.
- Backend real complete readiness aprovado.
- URL com marcador `local`, `staging`, `stage`, `stg`, `preview` ou `sandbox`.

## Resultado esperado
Sem credenciais reais, o status correto é bloqueado. Com ambiente real e relatórios válidos, o executor gera `reports/generated/backend-real-multidomain-staging-execution-report.json`.
