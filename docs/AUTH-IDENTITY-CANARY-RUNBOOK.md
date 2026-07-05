# Auth/Identity Canary Runbook — Sprint 25

Este runbook define como ligar o canary de autenticação e identidade no frontend sem migrar o restante do produto para API.

## Objetivo

Validar em `local` ou `staging` que o frontend consegue usar a API real apenas para autenticação e identidade:

- `POST /auth/login`
- `GET /auth/session`
- `GET /users/me`
- `GET /profiles/me`

Durante todo o canary, o restante do produto deve permanecer em mock/localStorage.

Contrato obrigatório:

```txt
authProvider=api
dataProvider=mock
enableNetworkRequests=true
```

## Escopo permitido

Permitido:

- login real controlado;
- refresh/leitura de sessão real;
- leitura de usuário atual;
- leitura de perfil atual;
- atualização futura de `/users/me` e `/profiles/me` apenas depois do smoke de leitura passar.

Proibido nesta sprint:

- trocar `dataProvider` para `api`;
- ligar pedidos, mensagens, notificações, carteira, disputas, recibos ou admin no frontend real;
- alterar HTML visual, CSS, shell, header, sidebar ou layout;
- usar credenciais reais versionadas;
- usar ambiente com aparência de produção.

## Ativação manual no navegador

Com uma URL staging/local segura, rode no console do navegador:

```js
DokeAuth.configureAuthIdentityCanary({
  apiBaseUrl: 'https://staging-api.doke.example'
});
```

Depois recarregue a página e confira:

```js
DokeAuth.getAuthIdentityCanaryStatus();
DokeAuth.getAuthProviderStatus();
```

O status só está correto quando:

- `active === true`;
- `requestedAuthProvider === 'api'`;
- `dataProvider === 'mock'`;
- `networkEnabled === true`;
- `blockers` vazio.

## Ativação por query string

Para teste pontual sem persistir manualmente:

```txt
auth/login.html?dokeAuthIdentityCanary=1&dokeAuthProvider=api&dokeDataProvider=mock&dokeApiBaseUrl=https://staging-api.doke.example&dokeEnableNetwork=1
```

A query `dokeAuthIdentityCanary=1` força o contrato de `dataProvider=mock` dentro de `runtime-config.js`.

## Rollback rápido

No console do navegador:

```js
DokeAuth.rollbackAuthIdentityCanary();
location.reload();
```

O rollback restaura os valores anteriores salvos em `doke.canary.authIdentity.backup.v1`. Se não houver backup, remove as chaves de canary:

- `doke.canary.authIdentity.enabled`
- `doke.authProvider`
- `doke.dataProvider`
- `doke.apiBaseUrl`
- `doke.flag.enableNetworkRequests`

## Smoke automatizado

Antes de aplicar `supabase/seed/002_mvp_controlled_seed.sql`, provisione os
quatro usuários canary pelo Admin API, usando apenas variáveis locais:

```bash
DOKE_ENVIRONMENT=staging \
SUPABASE_URL=https://project-ref.supabase.co \
DOKE_SUPABASE_PROJECT_REF=project-ref \
SUPABASE_SERVICE_ROLE_KEY=... \
DOKE_STAGING_CLIENT_PASSWORD=... \
DOKE_STAGING_PROFESSIONAL_PASSWORD=... \
DOKE_STAGING_SUPPORT_PASSWORD=... \
DOKE_STAGING_ADMIN_PASSWORD=... \
DOKE_STAGING_AUTH_PROVISION_CONFIRM=provision-staging-auth-canaries \
npm run provision:staging-auth-canaries
```

Para substituir os quatro usuários antigos criados diretamente por SQL,
adicione `DOKE_STAGING_AUTH_REPLACE_LEGACY=1`. Essa operação pode acionar
`on delete cascade` nas tabelas públicas; reaplique o seed 002 imediatamente
depois. O script nunca imprime service role key, senhas, sessões ou tokens.

Dry-run sem rede:

```bash
npm run validate:auth-identity-canary:dry-run
```

Execução real controlada:

```bash
DOKE_ENVIRONMENT=staging \
DOKE_AUTH_IDENTITY_CANARY_API_URL=https://staging-api.doke.example \
DOKE_AUTH_IDENTITY_CANARY_ALLOW_NETWORK=1 \
DOKE_AUTH_IDENTITY_CANARY_ROLES=client,professional \
npm run validate:auth-identity-canary
```

Se a URL staging não tiver marcador claro, adicione:

```bash
DOKE_AUTH_IDENTITY_CANARY_MARKER=staging
```

Credenciais podem ser sobrescritas por role:

```bash
DOKE_STAGING_CLIENT_EMAIL=cliente@staging.example
DOKE_STAGING_CLIENT_PASSWORD=senha-segura
DOKE_STAGING_PROFESSIONAL_EMAIL=profissional@staging.example
DOKE_STAGING_PROFESSIONAL_PASSWORD=senha-segura
```

Sem essas variáveis, o smoke usa os usuários seedados já definidos em `backend/shared/testing/staging-e2e-scenarios.js`.

## Gates antes de considerar o canary aprovado

1. `npm run audit:auth-identity-canary-contract`
2. `npm run validate:auth-identity-canary:dry-run`
3. `npm run audit:auth-real-contract`
4. `npm run audit:identity-profile-contract`
5. `npm run audit:data-provider-flags`
6. `npm run audit:staging-runtime-readiness`
7. `npm run validate:auth-identity-canary` em staging/local real
8. Login real funcionando em `auth/login.html`
9. `DokeAuth.refreshCurrentIdentity()` retorna usuário e perfil
10. `DokeAuth.rollbackAuthIdentityCanary()` volta para mock sem limpar outros dados do usuário

## Sinal verde operacional depois da Sprint 26

A execução real do canary só deve começar quando os gates estáticos, o dry-run e o gate de runtime de navegador da Sprint 26 passarem. Mesmo assim, pedidos, mensagens, notificações e carteira continuam em mock até um canary separado por domínio.

## Sprint 26 — Browser runtime safety gate

A Sprint 26 adiciona validação operacional de navegador para o canary sem depender de rede real. O objetivo é provar que o contrato do frontend funciona antes de qualquer teste manual em staging:

- estado padrão continua `authProvider=mock`, `dataProvider=mock` e `enableNetworkRequests=false`;
- alvo com aparência de produção é bloqueado antes de persistir chaves de canary;
- ativação com URL `local`/`staging` segura força `authProvider=api`, `dataProvider=mock` e rede ligada apenas para auth;
- login em canary chama somente `/auth/login`, `/users/me` e `/profiles/me` no runtime de navegador simulado;
- rollback restaura os valores anteriores de `authProvider`, `dataProvider`, `apiBaseUrl`, `enableNetworkRequests` e `targetMarker`.

Comando obrigatório antes de abrir o canary no navegador:

```bash
npm run validate:auth-identity-canary:browser-runtime
```

Relatório opcional:

```bash
npm run validate:auth-identity-canary:browser-runtime:report
```

### Target marker explícito

Se a URL de staging não tiver marcador visível como `staging`, `stage`, `stg`, `preview`, `local`, `localhost` ou `127.0.0.1`, a ativação manual deve declarar o alvo:

```js
DokeAuth.configureAuthIdentityCanary({
  apiBaseUrl: 'https://api-doke-sandbox.example',
  targetMarker: 'staging'
});
```

O canary continua bloqueando URLs com aparência de produção, como `prod`, `production` ou `live`.

## Sprint 27 — Local network canary harness

A Sprint 27 adiciona uma etapa intermediária entre o gate de navegador simulado e o staging real: o canary roda com chamadas HTTP reais contra um servidor local controlado, sem credenciais externas e sem tocar em produção.

Objetivo:

- executar o mesmo `scripts/validate-auth-identity-canary.js` usado no staging real;
- validar o caminho de rede HTTP completo em `localhost`/`127.0.0.1`;
- garantir que somente endpoints de auth/identity são chamados;
- bloquear qualquer vazamento para pedidos, mensagens, notificações, carteira, disputas, recibos ou admin;
- manter `authProvider=api`, `dataProvider=mock` e `enableNetworkRequests=true` apenas dentro da validação local.

Comando obrigatório antes do staging real:

```bash
npm run audit:auth-identity-canary-local-runtime
npm run validate:auth-identity-canary:local-runtime
```

Relatório opcional:

```bash
npm run validate:auth-identity-canary:local-runtime:report
```

O harness local sobe `backend/shared/testing/auth-identity-canary-local-server.js`, aponta `DOKE_AUTH_IDENTITY_CANARY_API_URL` para `http://127.0.0.1:<porta>`, liga `DOKE_AUTH_IDENTITY_CANARY_ALLOW_NETWORK=1` e executa o smoke real de auth/identity. A saída esperada contém chamadas para:

- `POST /auth/login`
- `GET /auth/session`
- `GET /users/me`
- `GET /profiles/me`

Se o smoke chamar qualquer endpoint de domínio fora dessa fronteira, o gate falha.

Apenas depois deste gate local passar faz sentido apontar `npm run validate:auth-identity-canary` para Supabase/staging real com credenciais seguras.

## Sprint 28 — Promotion gate antes do staging real

A Sprint 28 adiciona um gate de promoção para impedir avanço indevido depois dos testes locais. Ele não liga domínio novo em API e não substitui o canary real; ele consolida as validações obrigatórias e deixa explícito quando o projeto ainda está bloqueado por falta de relatório real.

Comandos obrigatórios:

```bash
npm run audit:auth-identity-canary-promotion-gate
npm run validate:auth-identity-canary:promotion-gate:dry-run
npm run validate:auth-identity-canary:promotion-gate
```

O gate executa novamente:

- `npm run audit:auth-identity-canary-contract`
- `npm run audit:auth-identity-canary-local-runtime`
- `npm run validate:auth-identity-canary:browser-runtime`
- `npm run validate:auth-identity-canary:local-runtime`
- `npm run validate:auth-identity-canary:dry-run`

Para transformar o gate em bloqueio estrito de promoção, gere primeiro um relatório real de local/staging:

```bash
DOKE_ENVIRONMENT=staging \
DOKE_AUTH_IDENTITY_CANARY_API_URL="https://staging-api.doke.example" \
DOKE_AUTH_IDENTITY_CANARY_ALLOW_NETWORK=1 \
DOKE_AUTH_IDENTITY_CANARY_REPORT_PATH=reports/generated/auth-identity-canary-report.json \
npm run validate:auth-identity-canary -- --write-report
```

Depois rode:

```bash
DOKE_AUTH_IDENTITY_CANARY_REQUIRE_REAL_REPORT=1 \
npm run validate:auth-identity-canary:promotion-gate
```

Sem esse relatório, o gate pode passar como preflight local, mas o status operacional permanece `blocked_until_real_auth_identity_canary_report`. Isso é intencional: canary de pedidos, mensagens, notificações, carteira ou admin continua proibido até o relatório real de Auth/Identity passar.

## Sprint 29 — dependência para Orders read-only canary

O canary de pedidos read-only depende obrigatoriamente do status:

```txt
auth_identity_canary_ready_for_manual_staging_rollout
```

A validação `npm run validate:orders-readonly-canary:local-runtime` pode rodar sem relatório real apenas por usar servidor local em `127.0.0.1` e `DOKE_ORDERS_READONLY_CANARY_BYPASS_AUTH_GATE=local-runtime`. Qualquer execução real de pedidos em local/staging deve exigir o relatório de promoção de Auth/Identity.
