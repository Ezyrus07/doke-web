# COM-B02D — composition root e canário autenticado read-only

Contrato: `com-b02d-community-composition-root-canary-readiness-v1`.

## Composition root

O arquivo `backend/runtime/staging/community-composition-root.js` recebe `serviceSupabase` por injeção server-side, reduz a superfície à autoridade `server_service_role` e mantém allowlist exclusiva da RPC `com_load_canonical_state_v1`.

O root expõe somente `probeCanonicalState`. Idempotência, eventos, projeções e RPCs mutáveis permanecem inacessíveis.

```text
composition root prepared: true
connected to main runtime: false
route registered: false
mutating RPC exposed: false
```

## Histórico do canário

### Tentativa 1

O run `31024711149` falhou em modo fechado no auditor estático, antes de qualquer conexão ao banco. A autorização foi consumida e não reutilizada.

### Tentativa 2

A nova autorização explícita foi recebida em 5 de agosto de 2026:

```text
I_EXPLICITLY_AUTHORIZE_COM_B02D_AUTHENTICATED_READ_ONLY_CANARY_ON_DOKE_STAGING
```

```text
authenticated read-only canary: passed
run: 31026205446
job: 92375512459
artifact: 8938744322
actor source: server_verified_authenticated_session
aal: aal1
probe result: null
counts unchanged: true
domain rows created: 0
transaction read only: true
ended with rollback: true
database mutation executed: false
```

O canário construiu o composition root real e invocou somente `com_load_canonical_state_v1`. As contagens de `community_state`, `community_event` e `command_idempotency` permaneceram `0/0/0` antes, depois e no postflight.

## Efeitos finais

```text
database read executed by canary: true
database mutation executed: false
fixture created: false
session created: false
route registered: false
runtime deployed: false
edge function deployed: false
production changed: false
pull request merged: false
```

## Autoridade encerrada

```text
authenticated canary authority: false
staging read authority: false
staging mutation authority: false
runtime deployment authority: false
production authority: false
pull request merge authority: false
```

Evidências:

- `docs/validation/COM-B02D-AUTHENTICATED-READ-ONLY-CANARY-ATTEMPT-1.json`
- `docs/validation/COM-B02D-AUTHENTICATED-READ-ONLY-CANARY-ATTEMPT-2.json`
