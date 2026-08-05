# COM-B02D — execução do canário autenticado read-only

## Autorizações

A frase congelada para cada tentativa é:

```text
I_EXPLICITLY_AUTHORIZE_COM_B02D_AUTHENTICATED_READ_ONLY_CANARY_ON_DOKE_STAGING
```

Cada autorização é independente, de uso único e não reutilizável.

## Tentativa 1

```text
attempt 1: failed closed
run: 31024711149
job: 92370362046
failed stage: executor audit
database connection attempted: false
database mutation executed: false
```

A causa foi `static_auditor_literal_mismatch`. Nenhuma leitura do canário ou efeito remoto ocorreu.

## Tentativa 2

Contrato: `com-b02d-authenticated-read-only-canary-attempt-2-v1`.

```text
attempt 2: success
run: 31026205446
authorization job: 92375209275
execution job: 92375512459
artifact id: 8938744322
artifact digest: sha256:2d7e7b292c14770900f2de8939abb34e648c173da24917785431783b1e5d1371
```

Execução certificada:

1. confirmou o PR #61 aberto, draft, não mesclado e sem auto-merge;
2. confirmou o projeto `doke-web-staging` saudável;
3. resolveu uma sessão autenticada existente `aal1` sem expor identificadores brutos;
4. abriu `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`;
5. confirmou migration, schema e grants;
6. ativou `service_role` apenas dentro da transação;
7. construiu o composition root real;
8. invocou exclusivamente `com_load_canonical_state_v1`;
9. recebeu `null` para o UUID de probe;
10. comparou contagens antes, depois e no postflight;
11. encerrou com `ROLLBACK`.

```text
read only: true
mutation authority: false
counts unchanged: true
community_state: 0 -> 0 -> 0
community_event: 0 -> 0 -> 0
command_idempotency: 0 -> 0 -> 0
domain rows created: 0
raw identifiers exposed: false
```

## Efeitos proibidos preservados

```text
database mutation executed: false
fixture created: false
session created: false
route registered: false
runtime deployed: false
edge function deployed: false
production changed: false
pull request merged: false
```

A autorização da tentativa 2 está consumida e todas as autoridades temporárias voltaram para `false`.
