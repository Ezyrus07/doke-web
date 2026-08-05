# COM-B02D — execução do canário autenticado read-only

Contrato: `com-b02d-authenticated-read-only-canary-execution-v1`.

## Autorização

```text
I_EXPLICITLY_AUTHORIZE_COM_B02D_AUTHENTICATED_READ_ONLY_CANARY_ON_DOKE_STAGING
```

A autorização é de uso único, não é reutilizável após falha e não concede autoridade de mutação, deploy, produção ou merge.

## Alvo congelado

```text
project: doke-web-staging
project id: zwkczgewzbsorbrjuzpb
migration version: 20260805153539
probe community id: 00000000-0000-4000-8000-0000000000d2
```

## Execução

O executor:

1. confirma que o PR #61 permanece aberto, draft, não mesclado e sem auto-merge;
2. confirma o projeto staging ativo e saudável;
3. conecta ao Postgres com secrets existentes do repositório;
4. seleciona uma sessão existente válida associada a usuário ativo;
5. não registra e-mail, token, IP, UUID de usuário ou UUID de sessão na evidência;
6. abre `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`;
7. confirma migration, objetos e grants;
8. ativa `service_role` somente dentro da transação;
9. constrói o `community-composition-root.js` real;
10. invoca somente `probeCanonicalState` e `com_load_canonical_state_v1`;
11. confirma resultado ausente para o UUID de probe;
12. compara contagens antes, depois e no postflight;
13. encerra com `ROLLBACK`.

## Proibições

O executor não contém SQL de escrita, não chama RPC mutável, não cria fixture, não cria sessão, não registra rota, não implanta runtime e não toca produção.

## Consumo

A adição única de `config/com-b02d-authenticated-read-only-canary-execution.json` dispara o workflow. Reruns são recusados por `GITHUB_RUN_ATTEMPT` e uma nova tentativa exige nova autorização explícita.
