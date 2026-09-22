# COM-B02C — aplicação da migration em staging

Contrato: `com-b02c-staging-migration-application-authorization-v1`

## Resultado

A autorização explícita foi recebida, validada e consumida uma única vez. A migration congelada foi aplicada exclusivamente no projeto `doke-web-staging` e passou pela verificação estrutural pós-aplicação.

Nenhum runtime foi implantado, nenhuma Edge Function foi alterada, nenhum dado de comunidade foi criado e produção permaneceu intocada.

## Autorização consumida

```text
phrase: I_EXPLICITLY_AUTHORIZE_COM_B02C_SERVER_AUTHORITY_MIGRATION_ON_DOKE_STAGING
received at: 2026-08-05T12:34:00-03:00
consumed at: 2026-08-05T15:35:39Z
single use: true
reusable: false
```

A presença da frase no repositório não concede nova autorização. O uso único já foi consumido.

## Migration aplicada

```text
path: supabase/migrations/20260805121500_com_b02b_server_authority.sql
git blob SHA: fd74f6abc029023c4e0972b32b35daca975c3d57
applied name: com_b02b_server_authority
Supabase recorded version: 20260805153539
target project: zwkczgewzbsorbrjuzpb
target environment: staging
productionAllowed: false
```

O preflight confirmou ausência de colisão de schema, tabelas e RPCs, presença de `service_role` e inexistência anterior da migration no histórico.

## Verificação estrutural

- schema `com_private` criado;
- tabelas `community_state`, `community_event` e `command_idempotency` criadas;
- RLS habilitada nas três tabelas;
- `anon` e `authenticated` sem acesso às tabelas;
- `anon` e `authenticated` sem execução das RPCs;
- `service_role` com execução das três RPCs previstas;
- RPC read-only executada sob `service_role` e retornou ausência de estado sem criar linhas;
- três RPCs com `SECURITY DEFINER` e `search_path` fixo;
- RPC de commit contém `FOR UPDATE`, insert de evento e update da projeção na mesma transação;
- contagem final: zero linhas nas três tabelas.

## Advisors

Os advisors oficiais não encontraram warning ou erro de segurança relacionado aos novos objetos COM. Foram emitidos três avisos informativos `rls_enabled_no_policy`, esperados porque as tabelas privadas são deliberadamente fail-closed e acessadas apenas por RPCs `service_role`.

Nenhum lint de performance foi associado aos novos objetos COM.

## Estado final

```text
authorization received: true
authorization consumed: true
migration applied: true
structural verification: passed
runtime deployed: false
staging mutation authority remaining: false
production authority: false
pull request merge authority: false
```

## Evidência

A evidência estruturada está em:

```text
docs/validation/COM-B02C-STAGING-MIGRATION-APPLICATION.json
```

## Próxima fronteira

Integração do adapter ao composition root, deploy server-side, canários autenticados, runtime, produção e merge permanecem bloqueados e exigem autorizações separadas.
