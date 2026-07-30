# ORD-A07C — Staging Migration Application Readiness

## Status

Readiness concluído. A migration A07C **não foi aplicada** ao staging.

O ledger A07B e sua RPC atômica já existem no staging. A função Cron ativa ainda usa o corpo anterior, sem `x-doke-worker-issued-at` e sem `x-doke-worker-nonce`.

## Migration canônica

- Arquivo: `supabase/migrations/20260730153500_ord_a07c_worker_invocation_headers.sql`
- SHA-256: `542411c1bd1d7db26301eb403601ddfa22e3284b45c817442aa917a8adcbf16e`
- Git blob: `5d5496cbbeaa9430bcb727cb961c2a64d6635f4b`

A migration substitui somente `private.invoke_order_event_worker_if_needed()`.

Ela não agenda, reagenda, desativa ou remove o job `doke-order-event-worker`. Também não cria secrets, não fixa URL de projeto e não publica Edge Functions.

## Comportamento preservado

A aplicação deverá preservar:

- recuperação de claims com 300 segundos;
- secret `doke_project_url` no Vault;
- secret `doke_order_event_worker_token` no Vault;
- endpoint `/functions/v1/order-event-worker`;
- source `cron`;
- payload com `limit: 25`;
- timeout de 30.000 ms;
- job ativo;
- agenda `* * * * *`;
- comando `select private.invoke_order_event_worker_if_needed();`.

A única evolução funcional permitida é a inclusão de:

- `x-doke-worker-issued-at`, em epoch milliseconds com 13 dígitos;
- `x-doke-worker-nonce`, base64url sem padding com 32 caracteres, gerado a partir de 24 bytes criptográficos.

## Autorização obrigatória

A aplicação exige exatamente:

`I_EXPLICITLY_AUTHORIZE_ORD_A07C_WORKER_INVOCATION_HEADERS_MIGRATION_ON_DOKE_STAGING`

Comandos genéricos como “próximo”, “continue” ou “pode prosseguir” não autorizam a aplicação.

Mesmo após a frase exata, o escopo será limitado a:

1. aplicar a migration A07C canônica no staging;
2. verificar o corpo da função;
3. confirmar que agenda, comando, secrets, payload e timeout foram preservados;
4. confirmar que A07B e os contadores do domínio permanecem íntegros.

A frase não autoriza deploy da Edge Function, canário remoto, Railway, produção ou merge do PR.

## Planner

O planner admite somente:

- `--dry-run`;
- `--check-env`.

There is no execute mode.

O planner não contém cliente Supabase, `fetch`, `apply_migration`, `db push` ou deploy. Seu resultado sempre declara zero requisições de rede e zero mutações.

## Pós-checks obrigatórios

Após uma autorização futura e aplicação controlada, deverão ser verificados:

- migration registrada;
- função com os dois novos headers;
- formato de timestamp e nonce;
- job ainda ativo;
- agenda ainda `* * * * *`;
- comando ainda canônico;
- Vault e token preservados;
- payload e timeout preservados;
- A07B presente;
- contadores de pedidos, orçamentos, histórico, eventos, métricas e tentativas inalterados.

## Rollback

Rollback is forward-only.

O histórico de migrations não poderá ser apagado ou editado. Um rollback exigirá uma nova migration revisada que restaure o corpo anterior da função, mantendo o job e a agenda intactos.

## Limites atuais

- A07C aplicada: não;
- agenda alterada: não;
- Cron alterado: não;
- Edge Function publicada: não;
- canário remoto executado: não;
- produção: bloqueada;
- Railway: não selecionado.

This inspection performed no mutation.
