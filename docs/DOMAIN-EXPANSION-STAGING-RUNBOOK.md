# Domain Expansion Staging Runbook

## Objetivo
Executar smoke real de staging para anunciar, publicar e comunidade somente após backend base estar validado.

## Comandos
```bash
npm run audit:domain-expansion-staging-executor
npm run execute:domain-expansion:staging:dry-run
npm run execute:domain-expansion:staging:check-env
npm run execute:domain-expansion:staging
npm run execute:domain-expansion:staging:report
```

## Variáveis obrigatórias para execução real
```bash
DOKE_ENVIRONMENT=staging
DOKE_DOMAIN_EXPANSION_STAGING_API_URL=https://staging-api.example
DOKE_DOMAIN_EXPANSION_STAGING_ALLOW_NETWORK=1
DOKE_DOMAIN_EXPANSION_STAGING_ALLOW_MUTATIONS=1
DOKE_DOMAIN_EXPANSION_STAGING_EXECUTE=1
DOKE_DOMAIN_EXPANSION_STAGING_CONFIRM=execute-domain-expansion
```

## Relatórios exigidos
- `backend_real_e2e_local_runtime_validated`
- `backend_real_observability_ready_for_manual_staging_rollout`
- `domain_expansion_ready_for_manual_contract_sprints`
- `domain_expansion_local_runtime_validated`

## Status
- Bloqueado: `blocked_until_domain_expansion_staging_prerequisites`
- Alvo inseguro: `blocked_unsafe_domain_expansion_staging_target`
- Aprovado: `domain_expansion_staging_execution_validated`
