# Staging Real Preparation Package Runbook — Sprint 127–129

## Objetivo

Preparar a execução real de staging sem executar rede, sem mutação e sem credenciais hardcoded.

## Comandos

```bash
npm run audit:staging-real-preparation-package
npm run validate:staging-real-preparation:dry-run
npm run validate:staging-real-preparation
npm run validate:staging-real-preparation:check-env
npm run validate:staging-real-preparation:report
```

## Variáveis obrigatórias para check-env

```bash
DOKE_ENVIRONMENT=staging
DOKE_BACKEND_REAL_STAGING_API_URL=https://staging-api.example
DOKE_BACKEND_REAL_STAGING_ALLOW_NETWORK=1
DOKE_BACKEND_REAL_STAGING_ALLOW_MUTATIONS=1
DOKE_BACKEND_REAL_STAGING_EXECUTE=1
DOKE_BACKEND_REAL_STAGING_CONFIRM=execute-backend-real-multidomain
```

Domínios complementares usam:

```bash
DOKE_PRODUCT_BETA_STAGING_API_URL=...
DOKE_BETA_LAUNCH_STAGING_API_URL=...
```

## Guardrails

- URL com aparência de produção deve ser bloqueada.
- Ambiente precisa ser `local` ou `staging`.
- Execução real continua manual.
- Este pacote não cria credenciais.
- Este pacote não roda Supabase real sozinho.

## Status sem ambiente real

```txt
staging_real_preparation_package_ready_for_manual_environment_binding
```
