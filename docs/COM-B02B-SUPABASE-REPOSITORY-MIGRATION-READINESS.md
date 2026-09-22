# COM-B02B — Supabase repository and immutable migration readiness

Contrato: `com-b02b-supabase-repository-migration-readiness-v1`.

## Escopo

Este sublote prepara o adapter server-side e a migration imutável do COM-B02. Nenhuma migration foi aplicada e nenhuma conexão Supabase foi aberta.

## Autoridade

As RPCs são revogadas de `public`, `anon` e `authenticated` e concedidas somente a `service_role`. O adapter exige um executor marcado como `server_service_role`; não cria cliente, não lê variáveis de ambiente e não contém credenciais.

## Consistência

- idempotência por ator, request UUID, chave SHA-256 e fingerprint;
- optimistic concurrency por revisão esperada;
- lock `FOR UPDATE` na projeção canônica;
- evento e projeção confirmados atomicamente na mesma função;
- eventos append-only por `(community_id, revision)`;
- RLS habilitada nas tabelas privadas;
- schema privado sem grants para browser roles.

## Estado atual

```text
adapterPrepared: true
migrationPrepared: true
migrationApplied: false
runtimeIntegrated: false
stagingValidated: false
migrationExecutionAuthority: false
stagingAuthority: false
productionAuthority: false
```

## Próxima fronteira

`COM-B02C`: autorização explícita para aplicar a migration em staging e executar verificação estrutural. Aplicação, rollback, canários autenticados e deploy permanecem fora deste sublote.
