# Auth Integration Contract

Este contrato define a autoridade canônica de autenticação, sessão, identidade pública e compatibilidade histórica da Doke.

## Autoridade atual

Supabase Auth é a única autoridade ativa de autenticação no navegador.

- login, cadastro, recuperação, refresh e logout usam o SDK do Supabase;
- o snapshot `doke.auth.session.v1` contém apenas identidade pública e estado de renderização;
- query string, `localStorage` e `window.DOKE_RUNTIME_CONFIG.authProvider` não escolhem mais provider de autenticação;
- o antigo adapter `/auth/*` permanece apenas como compatibilidade histórica e diagnóstico CLI-only;
- páginas e renderers não chamam endpoints de autenticação diretamente.

`DokeAuth.getAuthProviderStatus()` deve retornar `activeProvider: 'supabase'` e `requestedProvider: 'supabase'` em qualquer ambiente do navegador.

## Histórico Sprint 11C–12A

As Sprints 11C e 12A criaram o contrato de provider mock/API necessário para a transição inicial. Esse mecanismo não é mais autoridade ativa. AUTH-A09 aposentou a seleção de provider por estado gravável no navegador sem apagar os adapters históricos antes de uma auditoria de remoção dedicada.

## Fonte de verdade atual

- `assets/js/services/auth-service.js`: fachada pública e ponte da sessão Supabase;
- `assets/js/core/session.js`: snapshot público normalizado, sem tokens;
- `assets/js/services/auth-session-authority.js`: refresh e escopos de logout;
- `assets/js/services/auth-registration-authority.js`: cadastro e username;
- `assets/js/services/auth-password-authority.js`: recuperação, reset e reautenticação;
- `assets/js/core/permissions.js`: permissões por role;
- `assets/js/contracts/auth-domain-contract.js`: roles, providers históricos e status.

## Provider de autenticação

`supabase` é fixo como provider ativo do browser. Os valores históricos `mock` e `api` podem aparecer em snapshots de teste ou contratos de migração, mas não podem ser selecionados por usuário, query string ou storage.

`DokeAuth.getAuthIdentityCanaryStatus()` permanece somente como superfície de diagnóstico e informa que o browser canary foi aposentado. As operações mutáveis `configureAuthIdentityCanary` e `rollbackAuthIdentityCanary` não fazem mais parte da API pública.

## Diagnóstico do adapter histórico

O smoke de `/auth/login`, `/auth/session`, `/users/me` e `/profiles/me` continua disponível exclusivamente por scripts Node com variáveis de ambiente explícitas. Ele não altera o provider ativo do site e não persiste configuração no navegador.

## Session DTO oficial## Session DTO oficial

```js
{
  provider: 'mock' | 'api' | 'supabase',
  remember: true,
  user: User,
  accountStatus: 'active' | 'pending_review' | 'pending_email' | 'suspended' | 'disabled',
  sessionStatus: 'active' | 'expired' | 'revoked' | 'anonymous',
  expiresAt: 'ISO-8601',
  issuedAt: 'ISO-8601',
  updatedAt: 'ISO-8601'
}
```

## User DTO oficial

```js
{
  id: 'string',
  name: 'string',
  email: 'string',
  phone: 'string',
  role: 'guest' | 'client' | 'professional' | 'moderator' | 'support' | 'admin',
  type: 'same-as-role',
  handle: 'string',
  avatarUrl: 'string',
  initials: 'string',
  city: 'string',
  state: 'string',
  accountStatus: 'active',
  providerProfileId: 'string',
  isMockSupport: false,
  mockSupport: false
}
```

## Roles e permissões

| Role | Uso | Observação |
|---|---|---|
| `guest` | leitura pública | sem sessão |
| `client` | pedidos, pagamento, contestação, avaliação | não acessa admin |
| `professional` | aceitar pedido, cobrança, carteira, saque | não acessa admin |
| `moderator` | conteúdo e denúncias | não decide financeiro por padrão |
| `support` | suporte financeiro e contestações | acessa admin operacional |
| `admin` | plataforma e financeiro crítico | acesso total |

Acesso ao painel admin é permitido apenas quando:

```js
role === 'admin' ||
role === 'support' ||
isMockSupport === true ||
mockSupport === true
```

## Eventos de autenticação

- `auth_registered`.
- `auth_login_succeeded`.
- `auth_login_failed`.
- `auth_session_refreshed`.
- `auth_logout`.
- `auth_password_recovery_requested`.
- `auth_password_reset`.
- `auth_role_changed`.

Esses eventos devem virar `AuditEvent` real quando afetarem permissão, suporte ou dados sensíveis.

## Rotas restritas

Rotas privadas continuam classificadas por `assets/js/core/auth-route-map.js`. A Sprint 11C não altera comportamento de redirect para evitar regressão visual, mas define que a Sprint 12A deve tratar:

- sessão ausente → login com `next`.
- sessão expirada → tentar refresh; se falhar, login.
- conta suspensa/desabilitada → estado bloqueado.
- role sem permissão → estado 403 amigável.

## Regras para backend real

- Login/cadastro nunca devem ser chamados direto por página.
- Auth real entra por `assets/js/services/auth-service.js`, não por HTML.
- Token não deve ser lido por renderers.
- Frontend pode esconder ações, mas autorização final é backend/RLS.
- Admin/suporte sempre precisa de auditoria.
- Dados financeiros não podem confiar apenas na role do frontend.

## Critério de aceite

- Supabase é o único provider ativo no navegador.
- Cliente/profissional não acessam admin.
- Suporte/admin dependem de role canônica e políticas server-side.
- `Doke.session.getAuthContext()` retorna contexto completo.
- `DokeAuth.getAuthProviderStatus()` retorna `supabase_active`.
- Nenhum controle de browser escolhe `mock` ou `api` para autenticação.
- Tokens não entram no snapshot público da Doke.

## Sprint 12B — usuários e perfis reais em modo controlado## Sprint 12B — usuários e perfis reais em modo controlado

A Sprint 12B conecta identidade e perfil ao contrato de auth real sem migrar pedidos, mensagens, carteira, notificações ou financeiro.

### Fonte de verdade adicionada

- `assets/js/core/session.js` preserva `user.profile`, `user.profiles`, `publicProfileUrl` e `ownerProfileUrl` dentro da sessão normalizada.
- `assets/js/services/auth-service.js` passa a expor `DokeAuth.getCurrentIdentity()`, `DokeAuth.refreshCurrentIdentity()`, `DokeAuth.updateCurrentUser()` e `DokeAuth.updateCurrentProfile()`.
- `assets/js/repositories/users-repository.js` mantém atualização mock/local de usuário e perfil próprio para desenvolvimento.
- `assets/js/contracts/identity-profile-contract.js` documenta o DTO runtime de identidade/perfil.

### Endpoints oficiais de identidade/perfil

| Ação | Método | Endpoint | Observação |
|---|---:|---|---|
| usuário atual | GET | `/users/me` | retorna o User DTO privado da sessão |
| atualizar usuário atual | PATCH | `/users/me` | edita dados privados/conta |
| perfil atual | GET | `/profiles/me` | retorna o perfil público vinculado ao usuário atual |
| atualizar perfil atual | PATCH | `/profiles/me` | edita perfil público/owner |

### Regras

- Supabase Auth é a autoridade da credencial e da sessão.
- Os endpoints históricos `/users/me` e `/profiles/me` não são selecionáveis como provider ativo pelo navegador.
- Atualizações de identidade exigem uma autoridade remota dedicada; páginas e renderers continuam proibidos de chamar `fetch()` diretamente.
- Perfil público e perfil owner são derivados de role e perfil canônicos, não de HTML estático.

### DTO de identidade### DTO de identidade

```js
{
  user: User,
  profile: Profile,
  profiles: Profile[],
  publicProfileUrl: 'perfil.html | perfil-cliente.html',
  ownerProfileUrl: 'perfil-profissional.html | meu-perfil.html',
  provider: 'mock | api'
}
```

### Critério de aceite

- `DokeAuth.getCurrentIdentity()` retorna usuário e perfil quando há sessão.
- `Doke.session.getAuthContext()` inclui `profile`, `profiles`, `publicProfileUrl` e `ownerProfileUrl`.
- API de perfil fica bloqueada sem configuração de rede.
- Mock/localStorage continua funcionando sem backend.

## Sprints 25–28 — canary histórico aposentado

O antigo canary de browser permitia persistir `authProvider=api`, URL e flag de rede em `localStorage`. AUTH-A09 aposentou essa ativação porque ela criava uma autoridade concorrente escolhida pelo cliente.

O validador histórico permanece como diagnóstico CLI-only:

`npm run validate:auth-identity-canary:dry-run`

`npm run validate:auth-identity-canary`

A execução real exige ambiente local/staging explícito, credenciais de teste e `DOKE_AUTH_IDENTITY_CANARY_ALLOW_NETWORK=1`. Ela nunca muda o provider ativo do frontend.

## AUTH-A02 — sessão canônica Supabase## AUTH-A02 — sessão canônica Supabase

A sessão criptográfica deixou de ser duplicada no snapshot persistido pela Doke.

- O Supabase SDK continua responsável por persistência, renovação e revogação em `doke.supabase.auth`.
- `doke.auth.session.v1` contém apenas identidade pública, provider, status e metadados de renderização.
- Snapshots legados com `token`, `accessToken`, `access_token`, `refreshToken` ou `refresh_token` são saneados automaticamente na primeira leitura.
- `DokeAuth.getAccessToken()` consulta a autoridade ativa sem expor o segredo no Session Store.
- `getSession()` e `onAuthStateChange()` alimentam uma única ponte de reconciliação para login, refresh, revogação e logout.
- O provider API controlado mantém apenas access token volátil em memória; persistência durável exige cookie `httpOnly`.


## AUTH-A09 — autoridade fixa de provider

AUTH-A09 removeu `doke.authProvider`, `dokeAuthProvider`, `dokeAuthIdentityCanary` e as APIs públicas de ativação/rollback do canary. O runtime ignora pedidos de provider em storage, query string e configuração de janela; refresh, token resolution e bootstrap usam Supabase.
