# Auth Integration Contract

Este contrato define as autoridades canônicas de autenticação, sessão e identidade pública da Doke no estado atual do PR #9.

## Estado atual

Supabase Auth é a única autoridade ativa de autenticação no navegador.

- login, cadastro, recuperação, refresh, reautenticação e logout usam o SDK do Supabase;
- `doke.auth.session.v1` contém somente identidade pública e estado de renderização, nunca access token ou refresh token;
- query string, `localStorage` e configuração de janela não podem escolher outro provider de autenticação;
- páginas e renderers não chamam endpoints de autenticação diretamente;
- o adapter browser `/auth/*` foi removido fisicamente no AUTH-A10;
- perfil, configurações e onboarding usam operações self-service server-side reconciliadas desde o AUTH-A11;
- criação de conta, hash e atualização de senha locais foram retirados no AUTH-A12B.1;
- mutações locais genéricas de conta, perfil e configurações foram retiradas no AUTH-A12B.2;
- mutação local de onboarding, inferência local de conclusão e reescrita manual de sessão foram retiradas no AUTH-A12B.3.

## Fontes de verdade

- `assets/js/services/auth-service.js`: fachada pública de autenticação e ponte da sessão Supabase;
- `assets/js/core/session.js`: snapshot público normalizado e contexto de acesso;
- `assets/js/services/auth-session-authority.js`: refresh explícito e escopos de logout;
- `assets/js/services/auth-registration-authority.js`: cadastro e autoridade de username;
- `assets/js/services/auth-password-authority.js`: recuperação, reset e reautenticação;
- `assets/js/services/profile-service.js`: leitura e mutação reconciliada de perfil e configurações;
- `assets/js/services/onboarding-service.js`: leitura e conclusão reconciliada do onboarding;
- `assets/js/contracts/identity-profile-contract.js`: ações e autoridades atuais de identidade/perfil no navegador;
- `public.users` e `public.user_profiles`: fonte de verdade de conta, preferências, onboarding e perfil público;
- `self-service-operations`: transporte autenticado das operações de identidade pública;
- `assets/js/core/permissions.js`: permissões derivadas de role;
- `assets/js/contracts/auth-domain-contract.js`: roles e estados de conta/sessão.

## Provider de autenticação

O provider ativo do browser é sempre `supabase`.

`DokeAuth.getActiveAuthProvider()` permanece apenas como compatibilidade pública e retorna `supabase`. As antigas fachadas `getAuthProviderStatus`, `getAuthIdentityCanaryStatus`, `configureAuthIdentityCanary`, `rollbackAuthIdentityCanary`, `refreshApiSession`, `refreshCurrentIdentity`, `updateCurrentUser` e `updateCurrentProfile` não fazem parte da API pública atual.

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

## Identidade, perfil, configurações e onboarding

Supabase Auth é autoridade de credencial e sessão. `public.users` e `public.user_profiles`, protegidos por autoridade server-side, são a fonte de verdade de conta, onboarding, preferências e perfil público.

A API canônica do browser usa `self-service-operations`:

- `get_account_identity_state`: leitura canônica de identidade, perfil, configurações e onboarding;
- `update_account_profile_reconciled`: mutação de perfil seguida da resposta canônica do mesmo sujeito;
- `update_account_settings`: mutação restrita às seções permitidas de preferências;
- `complete_account_onboarding_reconciled`: conclusão do onboarding seguida da resposta canônica do mesmo sujeito.

Ações bem-sucedidas consomem a resposta do servidor e atualizam apenas caches de domínio. Elas não duplicam metadados com `supabase.auth.updateUser()` e não reescrevem manualmente o snapshot público da sessão.

Falha remota, payload inválido, sujeito divergente ou resposta incompleta devem preservar o snapshot anterior e falhar fechado.

Para usuários autenticados, onboarding não pode:

- concluir por repositório local;
- gravar `onboardingStatus` ou `onboardingCompletedAt` no navegador;
- chamar `Doke.session.setCurrentUser()`;
- emitir evento de conclusão local;
- inferir conclusão apenas por cidade e estado já preenchidos;
- continuar quando provider, cliente Supabase ou `self-service-operations` estiverem indisponíveis.

A ausência dessa autoridade produz `DOKE_ONBOARDING_AUTHORITY_UNAVAILABLE`.

## AUTH-A11 — reconciliação server-side concluída

AUTH-A11 removeu as fachadas de mutação de identidade do Auth, implantou as operações reconciliadas no staging e validou perfil, configurações e onboarding por uma identidade descartável autenticada através da Edge Function pública.

A migration 147 e o SQL 016 são a evidência server-side. Os runtimes permanentes estão em:

- `tests/auth/test-auth-profile-reconciliation-runtime.js`;
- `tests/auth/test-auth-settings-reconciliation-runtime.js`;
- `tests/auth/test-auth-onboarding-reconciliation-runtime.js`.

## AUTH-A12 — retirada da autoridade local residual

O AUTH-A12 separa leitura local histórica de mutação de identidade.

- `AUTH-A12A` — concluído: contrato runtime e testes reconciliados com Supabase e `self-service-operations`;
- `AUTH-A12B.1` — concluído: `create`, `hashPassword` e `updatePassword` retirados, com sanitização de credenciais históricas;
- `AUTH-A12B.2` — concluído: mutações genéricas de conta, perfil e configurações retiradas; fixture profissional isolada;
- `AUTH-A12B.3` — concluído: mutação local de onboarding, inferência local de conclusão e reescrita manual da sessão retiradas;
- `AUTH-A12C` — pendente: retirar promoção local de role e reescrita de sessão dos fluxos profissionais.

O contrato `identity-profile-contract.js` está em `AUTH-A12B.3` e declara:

- `localCredentialAuthority: 'retired'`;
- `localProfileMutationAuthority: 'retired'`;
- `localOnboardingMutationAuthority: 'retired'`;
- `manualOnboardingSessionRewrite: 'retired'`;
- `professionalFixtureMutationBoundary: 'isolated-pending-A12C'`.

O repositório local de usuários não exporta mutações. Fixtures locais são somente leitura e não podem derivar ou persistir role profissional.

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

A Sprint 12B introduziu os DTOs de identidade/perfil e os endpoints históricos `/users/me` e `/profiles/me` durante a transição de mock/API. Esses endpoints não são transportes ativos do navegador. Seu uso atual é exclusivamente diagnóstico CLI-only.

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
- perfil, configurações e onboarding usam respostas server-side reconciliadas;
- o repositório local não expõe criação, hash ou atualização de senha e não conserva campos de credencial;
- o repositório local não expõe `updateCurrentUser`, `updateCurrentProfile` ou `updateCurrentSettings`;
- perfil e configurações falham fechado sem `self-service-operations`;
- onboarding autenticado falha fechado sem Supabase e não possui conclusão ou inferência local;
- onboarding não reescreve manualmente o snapshot público da sessão;
- mutações locais inventariadas não podem assumir autoridade quando o Supabase está indisponível;
- PR #9 permanece draft e não deve ser mesclado sem autorização explícita.