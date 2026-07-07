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
npm run write:backend-real:multidomain-post-rotation-evidence
npm run validate:backend-real:observability-gate:dry-run
npm run validate:backend-real:observability-gate
npm run validate:backend-real:observability-gate:report
```

## Bloqueio correto
Sem sink/log drain real e sem relatórios reais, o status correto é `blocked_until_backend_real_observability_prerequisites`.

## Evidência pós-rotação sem mutação
Use `write:backend-real:multidomain-post-rotation-evidence` somente para registrar a rodada multidomain já validada e limpa pós-rotação. O comando não repete chamadas reais, não executa cleanup, não lê `.env.local` e não configura sink/drain.

O gate deve bloquear evidências multidomain antigas que ainda contenham `POST /notifications/read-all` ou `POST /withdrawals` obrigatório. Withdrawal só é aceito como executado quando houver saldo suficiente, ou como skipped com motivo `insufficient_available_balance_for_optional_withdrawal`.

## Sink local sem rede
Para staging/local sem drain remoto, use um arquivo NDJSON local:

```bash
set DOKE_BACKEND_REAL_OBSERVABILITY_LOG_SINK=reports/generated/backend-real-observability-events.ndjson
npm run validate:backend-real:observability-gate:report
```

O arquivo precisa ficar dentro de `reports/generated/`, usar extensÃ£o `.ndjson`, existir antes do gate e conter somente eventos sem secrets. Cada linha deve incluir os sinais obrigatÃ³rios: `request_id`, `actor_id`, `actor_role`, `domain`, `action`, `idempotency_key_hash`, `status_code`, `latency_ms` e `rollback_marker`.

NÃ£o use `DOKE_BACKEND_REAL_OBSERVABILITY_DRAIN_URL` para este fechamento local.
