# Backend Real Observability Runbook

## Objetivo
Definir o gate mínimo de observabilidade antes de rollout real multi-domain.

## Sinais obrigatórios
- `request_id`
- `actor_id`
- `actor_role`
- `domain`
- `action`
- `idempotency_key_hash`
- `status_code`
- `latency_ms`
- `rollback_marker`

## Comandos

```bash
npm run audit:backend-real-observability-contract
npm run validate:backend-real:observability-gate:dry-run
npm run validate:backend-real:observability-gate
npm run validate:backend-real:observability-gate:report
```

## Bloqueio correto
Sem sink/log drain real e sem relatórios reais, o status correto é `blocked_until_backend_real_observability_prerequisites`.
