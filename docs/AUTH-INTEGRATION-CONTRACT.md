# Auth Integration Contract

Este contrato define as autoridades canônicas de autenticação, sessão e identidade pública da Doke no estado atual do PR #9.

## Estado atual

Supabase Auth é a única autoridade ativa de autenticação no navegador.

- login, cadastro, recuperação, refresh, reautenticação e logout usam o SDK do Supabase;
- `doke.auth.session.v1` contém somente identidade pública e estado de renderização, nunca access token ou refresh token;
- query string, `localStorage` e configuração de janela não podem escolher outro provider;
- o adapter browser `/auth/*` foi removido fisicamente no AUTH-A10;
- perfil, configurações e onboarding usam operações server-side reconciliadas;
- criação de conta, hash e atualização de senha locais foram retirados no AUTH-A12B.1;
- mutações locais genéricas de conta, perfil e configurações foram retiradas no AUTH-A12B.2;
- conclusão e inferência local de onboarding foram retiradas no AUTH-A12B.3;
- promoção local de role profissional, decisões administrativas locais e reescritas profissionais de sessão foram retiradas no AUTH-A12C.

## Fontes de verdade

- Supabase Auth: autenticação e sessão criptográfica;
- `public.users`: conta, status e role canônica;
- `public.user_profiles`: perfil público;
- `self-service-operations`: identidade, perfil, configurações e onboarding;
- `professional-verification-operations`: revisão administrativa da identidade profissional;
- `decide_professional_identity_verification_internal`: transação server-side que decide a verificação e promove o role profissional;
- `assets/js/core/session.js`: snapshot público token-free;
- `assets/js/core/permissions.js`: permissões derivadas da role canônica;
- `assets/js/contracts/identity-profile-contract.js`: contrato atual `AUTH-A12C`.

## Provider de autenticação

O provider ativo do browser é sempre `supabase`.

`DokeAuth.getActiveAuthProvider()` permanece apenas como compatibilidade pública e retorna `supabase`. Nenhuma superfície ativa seleciona `mock` ou `api` para autenticação.

## Diagnóstico histórico CLI-only

O smoke histórico de `/auth/login`, `/auth/session`, `/users/me` e `/profiles/me` permanece exclusivamente em scripts Node com variáveis de ambiente explícitas.

Esses endpoints:

- não são carregados pelo navegador;
- não alteram o provider ativo;
- não gravam configuração no cliente;
- não constituem fallback de produção.

Comandos preservados:

```text
npm run validate:auth-identity-canary:dry-run
npm run validate:auth-identity-canary
```

A execução com rede exige ambiente local ou staging explícito, credenciais descartáveis e `DOKE_AUTH_IDENTITY_CANARY_ALLOW_NETWORK=1`.

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

A API canônica usa:

- `get_account_identity_state`;
- `update_account_profile_reconciled`;
- `update_account_settings`;
- `complete_account_onboarding_reconciled`.

Ações bem-sucedidas consomem a resposta canônica do servidor. Elas não duplicam identidade via `supabase.auth.updateUser()` e não reescrevem manualmente o snapshot público da sessão.

Falha remota, payload inválido, sujeito divergente ou resposta incompleta devem preservar o snapshot anterior e falhar fechado.

Onboarding autenticado não pode:

- concluir por repositório local;
- gravar `onboardingStatus` ou `onboardingCompletedAt` no navegador;
- chamar `Doke.session.setCurrentUser()`;
- emitir evento de conclusão local;
- inferir conclusão por cidade e estado;
- continuar sem provider Supabase, cliente ou transporte server-side.

A ausência dessa autoridade produz `DOKE_ONBOARDING_AUTHORITY_UNAVAILABLE`.

## Identidade e role profissional

`public.users.role` é a única fonte de role profissional.

O navegador não pode:

- promover um usuário porque documentos estão verificados;
- gravar role profissional em fixture local;
- alterar role durante uma operação de leitura;
- reescrever a sessão após aprovação;
- decidir aprovação ou rejeição por repositórios locais.

`professional-access-service.js` consulta:

- `public.users`;
- `professional_profiles`;
- `professional_identity_verifications`.

A role do contexto é copiada exclusivamente de `public.users.role`. Divergência entre role e documentos nunca promove o usuário.

UUID sem provider Supabase falha fechado com `DOKE_PROFESSIONAL_AUTHORITY_UNAVAILABLE`. Fixtures locais não UUID, quando necessárias, são somente leitura.

## Revisão profissional

`listForReview`, `getReviewDetail`, `startReview`, `approve` e `reject` usam exclusivamente `professional-verification-operations`.

A decisão server-side é executada por `decide_professional_identity_verification_internal`, que atualiza transacionalmente:

- verificação;
- perfil profissional;
- `public.users.role`;
- metadados protegidos.

Aprovação só é aceita pelo navegador quando a resposta confirma simultaneamente:

```text
status = verified
role = professional
```

Resposta incompleta falha com `DOKE_PROFESSIONAL_ROLE_RECONCILIATION_INCOMPLETE`. Ausência de reviewer remoto autorizado falha com `DOKE_PROFESSIONAL_REVIEW_AUTHORITY_UNAVAILABLE`.

## AUTH-A11 — reconciliação server-side

AUTH-A11 implantou as operações reconciliadas de identidade, perfil, configurações e onboarding. A migration 147 e o SQL 016 permanecem como evidência server-side.

Runtimes permanentes:

- `tests/auth/test-auth-profile-reconciliation-runtime.js`;
- `tests/auth/test-auth-settings-reconciliation-runtime.js`;
- `tests/auth/test-auth-onboarding-reconciliation-runtime.js`.

## AUTH-A12 — retirada da autoridade local residual

`AUTH-A12` está concluído:

- `AUTH-A12A`: contrato runtime e testes reconciliados;
- `AUTH-A12B.1`: credenciais locais retiradas;
- `AUTH-A12B.2`: mutações genéricas locais retiradas;
- `AUTH-A12B.3`: onboarding local retirado;
- `AUTH-A12C`: autoridade profissional local retirada.

O contrato `identity-profile-contract.js` está em `AUTH-A12C` e declara:

- `localCredentialAuthority: 'retired'`;
- `localProfileMutationAuthority: 'retired'`;
- `localOnboardingMutationAuthority: 'retired'`;
- `professionalRoleAuthority: 'server-only'`;
- `professionalReviewerAuthority: 'professional-verification-operations'`;
- `professionalFixtureMutationBoundary: 'retired'`;
- `manualProfessionalSessionRewrite: 'retired'`.

O repositório local de usuários não exporta mutações. Fixtures históricas são somente leitura e não podem derivar ou persistir role profissional.

## Roles e autorização

O frontend pode ocultar ações, mas autorização final pertence ao backend e às políticas RLS.

- `client`: pedidos, pagamento, contestação e avaliação;
- `professional`: operações profissionais autorizadas;
- `moderator`: moderação permitida;
- `support`: suporte operacional;
- `admin`: operações administrativas autorizadas.

Acesso administrativo depende de role canônica. Dados financeiros e decisões de identidade nunca podem confiar apenas no frontend.

## Rotas restritas

As rotas privadas são classificadas por `assets/js/core/auth-route-map.js`.

- sessão ausente: redirecionar para login preservando `next`;
- sessão expirada ou revogada: falhar fechado e tentar somente o refresh canônico;
- conta suspensa ou desabilitada: exibir estado bloqueado;
- role sem permissão: exibir estado 403 sem liberar conteúdo privado.

## Critérios de aceite atuais

- Supabase Auth é o único provider ativo no navegador;
- nenhum token do provider entra no snapshot público da Doke;
- o adapter `/auth/*` não existe no runtime do browser;
- diagnóstico histórico permanece CLI-only;
- perfil, configurações e onboarding usam respostas server-side reconciliadas;
- o repositório local não expõe criação, senha ou qualquer método `update*` de identidade;
- onboarding autenticado falha fechado sem autoridade server-side;
- `public.users.role` é a única fonte de role profissional;
- decisões administrativas profissionais são remotas;
- nenhuma sessão é reescrita manualmente por esses fluxos;
- alterações verificadas de e-mail e telefone continuam bloqueadas pelo AUTH-A07/MAIL-001;
- PR #9 permanece draft e não deve ser mesclado sem autorização explícita.
