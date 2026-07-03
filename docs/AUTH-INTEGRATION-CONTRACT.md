# Auth Integration Contract

Este contrato define a transição segura da autenticação mock/localStorage para autenticação real futura sem quebrar o fluxo atual do Doke.

## Escopo da Sprint 11C

A Sprint 11C não ligou backend real de autenticação. Ela fechou o contrato de sessão, roles, permissões, status e provider de auth para que a Sprint 12A pudesse conectar API/Supabase sem reescrever páginas.

## Escopo da Sprint 12A

A Sprint 12A liga o provider `api` de autenticação em modo controlado. O provider padrão continua `mock`; auth real só é usado quando `Doke.runtimeConfig.authProvider === 'api'`, `apiBaseUrl` existe e `enableNetworkRequests === true`. Pedidos, mensagens, carteira, notificações e admin continuam em mock/localStorage.

## Fonte de verdade atual

- `assets/js/core/session.js`: autoridade runtime da sessão atual.
- `assets/js/services/auth-service.js`: regras de login/cadastro/recuperação mock.
- `assets/js/repositories/users-repository.js`: usuários mock e usuários locais criados.
- `assets/js/core/permissions.js`: permissões por role.
- `assets/js/contracts/auth-domain-contract.js`: contrato de domínio para auth real futura.

## Provider de autenticação

O provider ativo continua sendo `mock` por padrão.

O provider `api` pode ser solicitado por configuração e agora executa chamadas reais de auth somente quando a configuração de rede está completa.

```js
Doke.runtimeConfig.authProvider // "mock" | "api"
DokeAuth.getAuthProviderStatus()
```

`api` só fica pronto para implementação quando:

1. `Doke.runtimeConfig.apiBaseUrl` existe.
2. `Doke.runtimeConfig.flags.enableNetworkRequests === true`.
3. os endpoints oficiais de auth estão disponíveis.
4. o contrato de sessão abaixo é preservado.


## Endpoints oficiais de auth — Sprint 12A

| Ação | Método | Endpoint | Observação |
|---|---:|---|---|
| login | POST | `/auth/login` | aceita `login`, `email`, `phone`, `password`, `remember` |
| cadastro | POST | `/auth/register` | aceita `name`, `email`, `phone`, `password`, `role` |
| sessão atual | GET | `/auth/session` | usa cookie httpOnly ou `Authorization: Bearer <token>` |
| logout | POST | `/auth/logout` | limpa sessão real; frontend limpa sessão local mesmo se a API falhar |
| recuperação | POST | `/auth/recovery` | solicita código/link para e-mail ou telefone |
| redefinir senha | POST | `/auth/reset-password` | valida código e define nova senha |

O serviço público continua sendo `DokeAuth`. As páginas de auth não chamam `fetch()` diretamente.

```js
DokeAuth.getAuthProviderStatus();
DokeAuth.refreshSession();
DokeAuth.signIn({ login, password });
DokeAuth.register({ name, email, password, role });
```

### Ativação controlada

```html
<script>
  window.DOKE_RUNTIME_CONFIG = {
    authProvider: 'api',
    apiBaseUrl: 'https://api.doke.example',
    flags: { enableNetworkRequests: true }
  };
</script>
```

ou em teste local:

```txt
auth/login.html?dokeAuthProvider=api&dokeApiBaseUrl=https://api.doke.example&dokeEnableNetwork=1
```

Se qualquer condição faltar, `DokeAuth.getAuthProviderStatus().activeProvider` permanece `mock`.

## Session DTO oficial

```js
{
  provider: 'mock' | 'api',
  token: 'string',
  refreshToken: 'string',
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

- Mock continua funcionando.
- Cliente/profissional não veem admin.
- Suporte/admin mock veem admin.
- `Doke.session.getAuthContext()` retorna contexto completo.
- `DokeAuth.getAuthProviderStatus()` informa se o provider ativo é `mock` ou `api`.
- Nenhum HTML visual é alterado.

## Sprint 12B — usuários e perfis reais em modo controlado

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

- `mock` continua sendo o comportamento padrão.
- As chamadas reais só ocorrem quando `authProvider === 'api'`, `apiBaseUrl` existe e `enableNetworkRequests === true`.
- Login/cadastro tentam enriquecer a sessão com `/users/me` e `/profiles/me`, mas falha de perfil não derruba o login.
- Perfil público e perfil owner são derivados de `user.role` e `user.profile`, não de HTML estático.
- Pages e renderers continuam proibidos de chamar `fetch()` diretamente.

### DTO de identidade

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
