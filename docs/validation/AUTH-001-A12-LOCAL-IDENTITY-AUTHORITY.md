# AUTH-001 / AUTH-A12 — Retirada da autoridade local residual de identidade

## Status

`DONE` — `AUTH-A12A`, `AUTH-A12B.1`, `AUTH-A12B.2`, `AUTH-A12B.3` e `AUTH-A12C` foram implementados e validados.

O AUTH-A12 retirou do runtime ativo do navegador qualquer autoridade local de credencial, perfil, configurações, onboarding, promoção de role profissional ou decisão administrativa de verificação.

## Objetivo

Separar definitivamente:

- autenticação e sessão criptográfica, cuja autoridade é Supabase Auth;
- conta, role, onboarding e perfil, cuja autoridade é server-side;
- leitura local histórica de fixtures, preservada somente quando necessária para transições e testes visuais;
- mutações locais históricas, que nunca podem operar como fallback de uma conta Supabase.

## Fases concluídas

### AUTH-A12A — contrato runtime reconciliado

Foram fixados:

- provider único do navegador: `supabase`;
- transporte de identidade: `self-service-operations`;
- operações canônicas `get_account_identity_state`, `update_account_profile_reconciled`, `update_account_settings` e `complete_account_onboarding_reconciled`;
- `/users/me` e `/profiles/me` somente como diagnóstico CLI histórico.

### AUTH-A12B.1 — credenciais locais retiradas

Foram removidos `create`, `hashPassword` e `updatePassword`. A leitura e a persistência de `doke.auth.users.v1` eliminam `password` e `passwordHash`.

Head validado: `7caf2dea2d3fafa25d80b50ba3c62047e8609332`.

### AUTH-A12B.2 — mutações genéricas retiradas

Foram removidos:

- `updateCurrentUser`;
- `updateCurrentProfile`;
- `updateCurrentSettings`;
- fallbacks locais de perfil e configurações;
- reescritas manuais de sessão nesses fluxos.

Head validado: `3866fbea076deba2328f9077a2d582b3a2c5033b`.

### AUTH-A12B.3 — onboarding local retirado

Foram removidos:

- conclusão local de onboarding;
- gravação local de `onboardingStatus` e `onboardingCompletedAt`;
- `Doke.session.setCurrentUser(...)` no onboarding;
- evento `source: 'local'`;
- inferência de conclusão por cidade e estado.

Usuário autenticado sem provider, cliente Supabase ou transporte canônico falha fechado com `DOKE_ONBOARDING_AUTHORITY_UNAVAILABLE`.

Head validado: `049821a2264cd6fb9fd136cbc0b3c993055cfc32`.

## AUTH-A12C — autoridade profissional server-only

### Causa-raiz

Três superfícies ainda permitiam decisões locais sobre identidade profissional:

1. `users-repository.js` exportava `updateProfessionalFixtureUser` e promovia fixtures durante uma operação de leitura;
2. `professional-access-service.js` podia derivar role profissional pelo estado dos documentos, persistir a promoção local e reescrever a sessão;
3. `professional-identity-verification-service.js` possuía decisões administrativas locais de fila, início, aprovação e rejeição, além de sincronização manual da sessão do usuário aprovado.

A migration 100 já continha a autoridade correta: `decide_professional_identity_verification_internal` atualiza transacionalmente a verificação, o perfil profissional, `public.users.role` e metadados protegidos, retornando o role canônico.

### Decisão arquitetural

- `public.users.role` é a única fonte de role profissional;
- documentos verificados não podem promover role no navegador;
- `professional-verification-operations` é a única superfície de revisão administrativa no browser;
- aprovação só é aceita quando o servidor devolve `status: 'verified'` e `role: 'professional'`;
- fixtures profissionais já materializadas podem ser lidas, mas nunca alteradas ou promovidas por uma leitura;
- nenhuma sessão pública pode ser reescrita manualmente pelos fluxos profissionais.

### Implementação

#### `assets/js/repositories/users-repository.js`

- removido `updateProfessionalFixtureUser`;
- removido `reconcileProfessionalUser`;
- removida promoção profissional durante `list()`;
- inventário de exports locais de mutação reduzido a `[]`;
- preservadas sanitização de credenciais e APIs de leitura.

#### `assets/js/services/professional-access-service.js`

- contexto Supabase consulta `public.users`, `professional_profiles` e `professional_identity_verifications`;
- role é copiado exclusivamente de `public.users.role`;
- divergência entre role e documentos não promove o usuário;
- UUID sem provider Supabase falha fechado com `DOKE_PROFESSIONAL_AUTHORITY_UNAVAILABLE`;
- fixture local não UUID permanece somente leitura;
- removidas promoção local e reescrita de sessão.

#### `assets/js/services/professional-identity-verification-service.js`

- `listForReview`, `getReviewDetail`, `startReview`, `approve` e `reject` exigem reviewer autorizado e provider Supabase;
- operações administrativas usam `professional-verification-operations`;
- aprovação incompleta falha com `DOKE_PROFESSIONAL_ROLE_RECONCILIATION_INCOMPLETE`;
- ausência da autoridade remota falha com `DOKE_PROFESSIONAL_REVIEW_AUTHORITY_UNAVAILABLE`;
- removidas ativação local, mutações de fixtures e sincronização manual da sessão.

#### Contrato e gates

- `identity-profile-contract.js` atualizado para `AUTH-A12C`;
- `professionalRoleAuthority: 'server-only'`;
- `professionalFixtureMutationBoundary: 'retired'`;
- `manualProfessionalSessionRewrite: 'retired'`;
- criado `tests/auth/test-auth-professional-authority-retirement-runtime.js`;
- runtime cumulativo de mutações locais atualizado;
- audit de identidade ampliado;
- gate permanente `Test professional authority retirement` incluído no Quality canônico;
- matriz determinística sincronizada.

### Testes permanentes

O runtime AUTH-A12C prova:

1. nenhum export local `update*` no repositório de usuários;
2. leitura de fixture não promove role nem altera perfis/verificações;
3. fixture profissional previamente materializada continua legível;
4. contexto Supabase consome `public.users.role`;
5. documentos verificados não sobrepõem role `client` do servidor;
6. nenhuma reescrita manual da sessão;
7. reviewer não Supabase falha fechado;
8. aprovação exige confirmação server-side de `verified + professional`;
9. repositórios locais de perfil/verificação não são chamados por decisões administrativas.

## Validação AUTH-A12C

Head de implementação validado:

`ab7872c805634b00750cc2bac761686a1cc23f3e`

Doke Quality Gates #679:

- auditorias estáticas e arquiteturais: sucesso;
- sessão canônica: sucesso;
- audit AUTH-A12: sucesso;
- runtimes de perfil e onboarding: sucesso;
- runtime AUTH-A12C: sucesso;
- matriz determinística: sucesso;
- governança, assets, partição E2E e `git diff --check`: sucesso;
- E2E bloqueante: sucesso;
- 105 guards visuais: sucesso.

Validação paralela:

- Doke Staging Edge HTTP Canary #453: sucesso;
- Doke Diagnostic E2E #474: sucesso.

## Supabase e produção

- Nenhuma migration foi criada ou aplicada no AUTH-A12C;
- nenhuma Edge Function foi implantada;
- nenhuma configuração ou dado de staging foi alterado;
- nenhuma conta real ou sintética persistente foi modificada;
- produção não foi alterada;
- nenhum SMS, OAuth ou recurso pago foi habilitado;
- PR #9 permanece draft e não deve ser mesclado sem autorização explícita.

## Critério de aceite do AUTH-A12

O AUTH-A12 foi encerrado porque o head validado provou simultaneamente:

1. zero autoridade local de credencial;
2. zero autoridade local genérica de conta, perfil e configurações;
3. zero autoridade local de conclusão de onboarding;
4. zero promoção local de role profissional;
5. zero decisão administrativa profissional local;
6. zero reescrita manual de sessão nesses fluxos;
7. inventário de mutações locais do repositório igual a `[]`;
8. fixtures históricas limitadas a leitura e sanitização;
9. Quality, E2E bloqueante, 105 guards, Canary e Diagnostic concluídos com sucesso;
10. nenhum workflow, codemod, hook ou diagnóstico temporário remanescente.

## Bloqueios preservados fora do AUTH-A12

- AUTH-A07 continua bloqueado por `MAIL-001` para alteração verificada de e-mail e canários transacionais reais;
- mudança de telefone permanece indisponível sem provider SMS;
- `PAID-001 / SEC-B05` continua bloqueado pelo plano atual do Supabase.
