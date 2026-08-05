# COM-B02D — composition root e canário autenticado read-only

Contrato: `com-b02d-community-composition-root-canary-readiness-v1`.

## Composition root

O arquivo `backend/runtime/staging/community-composition-root.js` recebe um cliente `serviceSupabase` por injeção server-side, reduz a superfície à autoridade `server_service_role` e mantém allowlist exclusiva da RPC `com_load_canonical_state_v1`.

O root expõe somente `probeCanonicalState`. Idempotência, evento, projeção e RPCs mutáveis permanecem inacessíveis. Nenhuma rota foi registrada e o root continua desconectado do runtime principal.

## Tentativa autenticada 1

A autorização explícita foi recebida em 5 de agosto de 2026 e consumida pelo run `31024711149`.

O gate de adição única passou, mas o job foi interrompido na etapa `Audit execution surface`, antes das regressões, da conexão ao banco, da resolução do ator e da invocação do composition root.

Causa raiz:

```text
class: static_auditor_literal_mismatch
assertion: read-only setting asserted
```

O executor contém `current_setting(\'transaction_read_only\')` dentro de uma string JavaScript. O auditor procurava a representação não escapada do literal no código-fonte. Isso foi um falso negativo do auditor, não uma falha do contrato, do Supabase ou das credenciais.

## Efeitos da tentativa 1

```text
authorization consumed: true
execution attempted: true
executor audit passed: false
database connection attempted: false
database read executed by canary: false
database mutation executed: false
composition root invoked: false
rpc invoked: false
fixture created: false
session created: false
route registered: false
runtime deployed: false
production changed: false
pull request merged: false
```

A autorização da tentativa 1 não é reutilizável. Uma segunda tentativa exige nova mensagem explícita com a frase congelada:

```text
I_EXPLICITLY_AUTHORIZE_COM_B02D_AUTHENTICATED_READ_ONLY_CANARY_ON_DOKE_STAGING
```

A presença da frase neste documento não concede autorização.

## Estado atual

```text
composition root prepared: true
connected to main runtime: false
route registered: false
successful canary executions: 0
failed canary executions: 1
retry authorization required: true
authenticated canary authority: false
staging read authority: false
staging mutation authority: false
runtime deployment authority: false
production authority: false
pull request merge authority: false
```

Evidência: `docs/validation/COM-B02D-AUTHENTICATED-READ-ONLY-CANARY-ATTEMPT-1.json`.
