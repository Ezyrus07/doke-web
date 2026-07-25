# Auth Integration Contract

Este contrato define as autoridades canônicas de autenticação, sessão e identidade pública da Doke no estado atual do PR #9.

## Estado atual

Supabase Auth é a única autoridade ativa de autenticação no navegador.

- login, cadastro, recuperação, refresh, reautenticação e logout usam o SDK do Supabase;
- `doke.auth.session.v1` contém somente identidade pública e estado de renderização, nunca access token ou refresh token;
- query string, `localStorage` e configuração de janela não podem escolher outro provider de autenticação;
- páginas e renderers não chamam endpoints de autenticação diretamente;
- o adapter browser `/auth/*` foi removido fisicamente no AUTH-A10.

## Fontes de verdade

- `assets/js/services/auth-service.js`: fachada pública de autenticação e ponte da sessão Supabase;
- `assets/js/core/session.js`: snapshot público normalizado e contexto de acesso;
- `assets/js/services/auth-session-authority.js`: refresh explícito e escopos de logout;
- `assets/js/services/auth-registration-authority.js`: cadastro e autoridade de username;
- `assets/js/services/auth-password-authority.js`: recuperação, reset e reautenticação;
- `assets/js/services/profile-service.js`: leitura e mutação de perfil público;
- `public.update_account_profile(...)`, chamada por `self-service-operations`: autoridade remota atual para perfil público;
- `assets/js/core/permissions.js`: permissões derivadas de role;
- `assets/js/contracts/auth-domain-contract.js`: roles e estados de conta/sessão.

## Provider de autenticação

O provider ativo do browser é sempre `supabase`.

`DokeAuth.getActiveAuthProvider()` permanece apenas como compatibilidade pública e retorna `supabase`. As antigas fachadas `getAuthProviderStatus`, `getAuthIdentityCanaryStatus`, `configureAuthIdentityCanary`, `rollbackAuthIdentityCanary`, `refreshApiSession` e `refreshCurrentIdentity` não fazem parte da API pública atual.

## Diagnóstico histórico CLI-only

O smoke histórico de `/auth/login`, `/auth/session`, `/users/me` e `/profiles/me` permanece exclusivamente em scripts Node com variáveis de ambiente explícitas. Esse diagnóstico CLI-only não é carregado pelo navegador, não muda o provider ativo e não grava configuração no cliente.

Comandos preservados:

```text
npm run validate:auth-identity-canary:dry-run
npm run validate:auth-identity-canary
```

A execução com rede exige ambiente local/staging explícito, credenciais descartáveis e `DOKE_AUTH_IDENTITY_CANARY_ALLOW_NETWORK=1`.

## Session DTO oficial

```js
{
  provider: 'supabase',
  remember: true,
  user: User,
  accountStatus: 'active' | 'pending_review' | 'pending_email' | 'suspended' | 'disabled',
  sessionStatus: 'active' | 'expired' | 'revoked' | 'anonymous',
  expiresAt: 'ISO-8601',
  issuedAt: 'ISO-8601',
  updatedAt: 'ISO-8601'
}
```

O SDK do Supabase é responsável pela sessão criptográfica. O snapshot da Doke não persiste `token`, `accessToken`, `access_token`, `refreshToken` ou `refresh_token`.

## User DTO público

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
  providerProfileId: 'string'
}
```

E-mail e telefone podem ser exibidos no contexto privado da conta, mas sua alteração verificada pertence ao AUTH-A07 e não pode ser simulada por mutação local.

## Identidade e perfil

Supabase Auth é autoridade de credencial e sessão. `public.users` e `public.user_profiles`, protegidos por autoridade server-side, são a fonte de verdade de conta, onboarding e perfil público.

A mutação de perfil usa `self-service-operations` com a ação `update_account_profile`. A função remota atualiza `public.user_profiles` e sincroniza os metadados públicos correspondentes em `auth.users`.

Após uma mutação remota bem-sucedida, o navegador deve reconciliar a sessão a partir do provider. Reescrever manualmente o usuário da sessão com `provider: 'mock'` não é um resultado válido para uma conta Supabase.

### Débito controlado para AUTH-A11

`auth-service.js` ainda expõe `updateCurrentUser` e `updateCurrentProfile` com caminhos locais herdados, enquanto `profile-service.js` e `onboarding-service.js` ainda possuem reescritas manuais do snapshot após operações remotas. Essas superfícies são compatibilidade transitória, não autoridade canônica, e serão removidas ou redirecionadas no AUTH-A11.

Preferências de conta não devem ser persistidas por uma falsa atualização de autenticação. Caso precisem de persistência remota, devem receber uma operação server-side própria sobre `public.users.settings`.

## Roles e autorização

O frontend pode ocultar ações, mas autorização final pertence ao backend/RLS.

- `client`: pedidos, pagamento, contestação e avaliação;
- `professional`: operações profissionais autorizadas;
- `moderator`: moderação de conteúdo;
- `support`: suporte operacional permitido;
- `admin`: operações administrativas autorizadas.

Acesso administrativo depende de role canônica e políticas server-side. Dados financeiros nunca podem confiar apenas no estado do frontend.

## Rotas restritas

As rotas privadas são classificadas por `assets/js/core/auth-route-map.js`.

- sessão ausente: redirecionar para login preservando `next`;
- sessão expirada ou revogada: falhar fechado e tentar somente o refresh canônico permitido;
- conta suspensa ou desabilitada: exibir estado bloqueado;
- role sem permissão: exibir estado 403 sem liberar conteúdo privado.

## Sprint 12B — registro histórico

A Sprint 12B introduziu os contratos de identidade/perfil e os endpoints históricos `/users/me` e `/profiles/me` durante a transição de mock/API. Esses endpoints não são mais um provider selecionável no navegador. O valor histórico desta seção é documentar a origem dos DTOs; a autoridade ativa atual é Supabase mais as operações self-service autorizadas.

## AUTH-A09 — autoridade fixa de provider

AUTH-A09 removeu `doke.authProvider`, `dokeAuthProvider`, `dokeAuthIdentityCanary` e as APIs públicas de ativação/rollback do canary. Refresh, resolução de token e bootstrap usam Supabase.

## AUTH-A10 — remoção física do adapter browser `/auth/*`

AUTH-A10 removeu endpoints, request helpers, token API temporário e branches do provider API de `assets/js/services/auth-service.js`. O único consumidor de página do refresh histórico foi migrado para `DokeAuth.refreshSession()`.

## Critérios de aceite atuais

- Supabase Auth é o único provider ativo no navegador;
- `DokeAuth.getActiveAuthProvider()` retorna `supabase`;
- nenhuma superfície pública ativa seleciona `mock` ou `api` para autenticação;
- nenhum token do provider entra no snapshot público da Doke;
- o adapter `/auth/*` não existe no runtime do browser;
- o diagnóstico histórico permanece CLI-only;
- alterações verificadas de e-mail/telefone continuam bloqueadas até o AUTH-A07 e MAIL-001;
- mutações de perfil/identidade pública não podem declarar sucesso apenas por reescrever o snapshot local;
- PR #9 permanece draft e não deve ser mesclado sem autorização explícita.
