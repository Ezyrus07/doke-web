# COM-B02D — composition root e readiness do canário autenticado

Contrato: `com-b02d-community-composition-root-canary-readiness-v1`

## Objetivo

Preparar a conexão repository-only entre o runtime staging canônico e o adapter Supabase de comunidades. Este sublote não registra rota, não implanta runtime e não executa qualquer leitura remota.

## Composition root

O arquivo `backend/runtime/staging/community-composition-root.js` recebe um cliente `serviceSupabase` já criado pelo runtime. Ele o reduz a um executor com autoridade `server_service_role` e allowlist exclusiva da RPC read-only `com_load_canonical_state_v1`.

O root expõe apenas `probeCanonicalState`. Métodos de idempotência, evento, projeção e qualquer autoridade mutável não são expostos. Ator anônimo, UUID inválido, ator inativo, runtime diferente de staging ou ausência do cliente server-side falham em modo fechado.

## Estado de integração

```text
composition root prepared: true
connected to main runtime: false
route registered: false
runtime deployed: false
network request executed: false
database read executed: false
database mutation executed: false
```

## Canário futuro

O canário futuro deverá:

1. resolver um usuário por sessão autenticada server-verified;
2. construir o composition root com o cliente service-role já confinado ao servidor;
3. consultar o UUID de probe `00000000-0000-4000-8000-0000000000d2`;
4. aceitar somente `null` ou uma projeção canônica válida;
5. confirmar que nenhuma tabela foi alterada.

A frase exigida é:

```text
I_EXPLICITLY_AUTHORIZE_COM_B02D_AUTHENTICATED_READ_ONLY_CANARY_ON_DOKE_STAGING
```

A presença da frase neste documento ou no código não representa autorização recebida. A autorização deve ser enviada explicitamente em mensagem posterior e será de uso único.

## Autoridade atual

```text
authenticated canary authority: false
staging read authority: false
staging mutation authority: false
runtime deployment authority: false
production authority: false
pull request merge authority: false
```
