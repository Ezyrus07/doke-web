# Doke — Product Beta Staging Runbook

## Objetivo
Preparar execução real futura em staging dos domínios finais de produto.

## Comandos
```bash
npm run audit:product-beta-staging-executor
npm run execute:product-beta:staging:dry-run
npm run execute:product-beta:staging:check-env
npm run execute:product-beta:staging
npm run execute:product-beta:staging:report
```

## Variáveis obrigatórias para execução real
```bash
DOKE_ENVIRONMENT=staging
DOKE_PRODUCT_BETA_STAGING_API_URL=https://staging-api.example
DOKE_PRODUCT_BETA_STAGING_ALLOW_NETWORK=1
DOKE_PRODUCT_BETA_STAGING_ALLOW_MUTATIONS=1
DOKE_PRODUCT_BETA_STAGING_EXECUTE=1
DOKE_PRODUCT_BETA_STAGING_CONFIRM=execute-product-beta-domains
```

## Bloqueios
- URL com aparência de produção é bloqueada.
- Sem flags explícitas, o executor só gera plano ou status bloqueado.
- Nenhuma credencial deve ser versionada.
