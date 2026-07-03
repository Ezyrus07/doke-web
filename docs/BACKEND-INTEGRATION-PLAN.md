# Backend Integration Plan

Este plano define a migração segura do Doke Web de mock/localStorage para backend real sem reescrever a experiência atual.

## Objetivo

Substituir gradualmente o armazenamento local por API/Supabase mantendo o contrato atual de pages → controllers → services/repositories → renderers.

## Princípios

1. Backend real entra por provider/repository, não por HTML.
2. Renderer nunca chama API.
3. CSS não muda por causa de backend.
4. A UI pode esconder ações, mas autorização real deve existir no backend.
5. Cada operação financeira sensível deve ser idempotente.
6. Toda ação admin deve gerar auditoria.
7. LocalStorage continua funcionando enquanto o provider real não for habilitado.

## Fases

### 11A — Contratos e adapter

- Fechar modelo de dados.
- Fechar status oficiais.
- Fechar eventos financeiros.
- Criar provider API inativo por padrão.
- Documentar endpoints e DTOs.
- Não conectar rede real.

### 11B — Provider API controlado por flag

- Permitir selecionar provider `mock` ou `api` em runtime.
- Manter fallback para mock quando API não estiver habilitada.
- Adicionar normalização por entidade.
- Criar smoke tests de list/get/mutate sem dependência visual.

### 11C — Autenticação real planejada

- Separar sessão mock de sessão real.
- Mapear roles e permissões.
- Definir refresh/session guard.
- Garantir que rotas restritas falhem de forma segura.

### 12 — Integração inicial

- Conectar leitura pública limitada: categorias, serviços, perfis e anúncios.
- Depois conectar pedidos/conversas.
- Por último conectar carteira/pagamentos/saques.

### 13 — Hardening

- RLS/policies.
- Rate limiting.
- logs de auditoria.
- validação server-side.
- observabilidade.
- testes de regressão por fluxo.

## Entidades de backend prioritárias

1. `users`.
2. `professional_profiles`.
3. `services`.
4. `orders`.
5. `conversations`.
6. `messages`.
7. `payments`.
8. `wallet_transactions`.
9. `receivables`.
10. `withdrawals`.
11. `disputes`.
12. `notifications`.
13. `receipts`.
14. `audit_events`.

## Endpoints-alvo

### Auth

- `POST /auth/login`.
- `POST /auth/logout`.
- `GET /auth/session`.
- `POST /auth/register`.

### Users/profiles

- `GET /users/me`.
- `PATCH /users/me`.
- `GET /professionals/:id`.
- `PATCH /professionals/:id`.

### Marketplace

- `GET /services`.
- `GET /services/:id`.
- `POST /services`.
- `PATCH /services/:id`.

### Orders

- `GET /orders`.
- `POST /orders`.
- `GET /orders/:id`.
- `POST /orders/:id/accept`.
- `POST /orders/:id/decline`.
- `POST /orders/:id/quote`.
- `POST /orders/:id/charge`.
- `POST /orders/:id/start`.
- `POST /orders/:id/complete`.
- `POST /orders/:id/status`.

### Conversations

- `GET /conversations`.
- `GET /conversations/:id/messages`.
- `POST /conversations/:id/messages`.

### Payments/wallet

- `POST /payments`.
- `GET /wallet`.
- `GET /wallet/transactions`.
- `GET /wallet/receivables`.
- `POST /withdrawals`.
- `POST /withdrawals/:id/approve`.
- `POST /withdrawals/:id/decline`.

### Disputes/admin

- `GET /admin/disputes`.
- `POST /disputes`.
- `POST /disputes/:id/respond`.
- `POST /admin/disputes/:id/release`.
- `POST /admin/disputes/:id/refund`.
- `GET /admin/audit-events`.

### Receipts/notifications

- `GET /receipts/:id`.
- `GET /notifications`.
- `POST /notifications/:id/read`.

## Regras de segurança

- Cliente só acessa pedidos/conversas dos quais participa.
- Profissional só acessa pedidos vinculados ao próprio perfil.
- Suporte/admin pode ver filas operacionais, mas toda ação gera `AuditEvent`.
- Pagamento, reembolso e saque não podem confiar em cálculo no frontend.
- IDs de transações e recibos devem ser gerados no backend.
- Anexos de mensagens precisam validar participante e tipo de arquivo.

## Estratégia de coexistência mock/API

- O provider ativo começa como `mock`.
- O provider `api` pode ser registrado, mas não deve ser ativado sem flag.
- Services expõem a mesma assinatura para mock e API.
- Repositories normalizam payloads antes de controllers.
- Falhas de API devem retornar erro normalizado para estado `error`, não quebrar a página.

## Critério de pronto para iniciar backend real

- Contratos de dados documentados.
- Eventos financeiros idempotentes.
- Permissões mapeadas.
- Provider API criado, mas inativo.
- Nenhuma página dependendo diretamente de `fetch`, Supabase ou tabelas.
- Fluxos mock principais validados localmente.

## Sprint 11B — readiness gate de provider

Antes de qualquer integração Supabase/API, o projeto deve passar pelo readiness gate abaixo:

1. `mock` é o provider padrão e deve funcionar sem configuração externa.
2. `api` é bloqueado quando `apiBaseUrl` está vazio.
3. `api` é bloqueado quando `enableNetworkRequests` está desligado.
4. `repositoryBoundary.getDataProviderStatus()` deve informar provider ativo, provider solicitado e prontidão da API.
5. Nenhuma página nova deve chamar backend do Doke diretamente.
6. Repositories antigos que ainda escrevem em localStorage continuam válidos até migração incremental por domínio.

### Ordem de migração após o gate

1. Auth/current user.
2. Usuários e perfis.
3. Pedidos.
4. Conversas/mensagens.
5. Notificações.
6. Carteira/financeiro.
7. Admin/auditoria.

Cada etapa deve trocar um domínio por vez e manter fallback mock até validação completa.

## Sprint 11C — contrato de autenticação real

A Sprint 11C adiciona o contrato de auth sem ativar backend real.

### Decisão

- `mock` continua sendo o provider ativo de autenticação.
- `api` pode ser solicitado por `Doke.runtimeConfig.authProvider` e, desde a Sprint 12A, executa auth real somente com `apiBaseUrl` e rede habilitada.
- `assets/js/core/session.js` é a autoridade runtime da sessão.
- `assets/js/contracts/auth-domain-contract.js` centraliza roles, status, permissões e eventos.
- `docs/AUTH-INTEGRATION-CONTRACT.md` é a fonte de verdade para DTO de sessão e regras de migração.

### Próxima etapa

A Sprint 12A implementa auth real em escopo pequeno: login, cadastro, sessão atual, logout e recuperação. Pedidos, mensagens e carteira permanecem em mock até a identidade real estar estável.


## Sprint 12A — auth real controlado

A Sprint 12A ativa autenticação real apenas quando a flag de auth está configurada com segurança. O comportamento padrão continua `mock`.

### Condições para usar API

- `Doke.runtimeConfig.authProvider === 'api'`.
- `Doke.runtimeConfig.apiBaseUrl` configurado.
- `Doke.runtimeConfig.flags.enableNetworkRequests === true`.

### Endpoints preparados

- `POST /auth/login`.
- `POST /auth/register`.
- `GET /auth/session`.
- `POST /auth/logout`.
- `POST /auth/recovery`.
- `POST /auth/reset-password`.

### Fronteira preservada

As páginas continuam chamando `DokeAuth.signIn`, `DokeAuth.register`, `DokeAuth.requestRecovery` e `DokeAuth.resetPassword`. Nenhuma página de auth chama backend diretamente. Pedidos, mensagens, carteira, notificações e admin permanecem em mock/localStorage até as próximas sprints.

## Sprint 12B — Usuários e perfis reais controlados

A Sprint 12B prepara a identidade real para sair do mock depois que o login real foi isolado na Sprint 12A.

### Decisão

- Auth real continua controlado por flag.
- `mock` continua padrão.
- Usuário atual e perfil atual passam a ter endpoints próprios: `/users/me` e `/profiles/me`.
- A sessão normalizada passa a guardar `profile`, `profiles`, `publicProfileUrl` e `ownerProfileUrl`.
- Pedidos, mensagens, carteira, notificações e admin permanecem em mock até a identidade real estar validada.

### Próxima etapa

Após validação local, o próximo domínio recomendado é marketplace/perfis públicos ou pedidos, não carteira. Carteira depende de identidade, pedido e transação já estarem confiáveis.


## Sprint 12C — Pedidos reais controlados

A Sprint 12C prepara o domínio `orders` para API real sem migrar mensagens, carteira, notificações ou financeiro.

### Decisão

- `Doke.services.orders` é a fronteira pública de páginas/controllers.
- Em provider `mock`, o fluxo continua usando `orders-repository` e localStorage para preservar conversa, notificações e carteira mockadas.
- Em provider `api`, `Doke.services.orders` chama `repositoryBoundary` para `list`, `getById`, `create` e ações de status.
- O backend passa a ser dono dos efeitos colaterais de pedidos em modo API: conversa vinculada, notificação e histórico operacional.
- O frontend ainda dispara eventos `doke:order-created` e `doke:order-status-changed` para manter os controllers desacoplados.

### Escopo explicitamente fora da Sprint 12C

- Mensagens reais.
- Carteira real.
- Notificações reais.
- Pagamento real.
- Supabase direto em páginas.

### Próxima etapa

Após validar pedidos em provider controlado, o próximo domínio é conversas/mensagens. Mensagens dependem de `orderId`, participantes e eventos operacionais já confiáveis.


## Sprint 12D — Messages API provider contract

- `messages` remains mock/localStorage by default and only uses API when `repositoryBoundary` reports active provider `api` with `apiBaseUrl` and `enableNetworkRequests`.
- Conversations use `GET /conversations`, `GET /conversations/:id`, `POST /orders/:id/conversation`, `POST /conversations/:id/order`, `POST /conversations/:id/messages`, and `POST /conversations/:id/read`.
- Pages must call `Doke.services.messages`; renderers must not call `fetch()` or backend endpoints directly.
- System events, charge cards, payment events and dispute events remain messages with typed payloads so the chat history can be migrated without changing UI renderers.

## Sprint 12E — Notificações reais controladas

A Sprint 12E prepara notificações para backend real sem migrar carteira ou financeiro.

### Decisão

- `Doke.services.notifications` é a fronteira pública de páginas/controllers.
- Em provider `mock`, o fluxo continua usando `notifications-repository` e localStorage.
- Em provider `api`, `Doke.services.notifications` chama `repositoryBoundary` para listar, criar, marcar como lida, dispensar e marcar todas como lidas.
- O backend passa a ser dono da criação automática de notificações derivadas de pedido, mensagem, pagamento, contestação e saque em modo API.
- O frontend preserva `eventKey`, `targetUrl` e `actionLabel` para não quebrar navegação e deduplicação.

### Próxima etapa

Após pedidos, mensagens e notificações, o próximo domínio recomendado é carteira/financeiro em modo controlado. Carteira depende dos eventos de pedido, conversa e notificação já estarem confiáveis.

## Sprint 12F — Carteira/financeiro real controlado

A Sprint 12F prepara o domínio de carteira para backend real sem ativar rede por padrão. O provider `mock` continua padrão; `api` só opera quando `apiBaseUrl` e `enableNetworkRequests` estiverem configurados.

### Escopo preparado

- `GET /wallet` para resumo de saldo.
- `GET /wallet/transactions` para extrato.
- `GET /wallet/dashboard` para estatísticas mensais.
- `GET /wallet/monthly-history` para histórico financeiro.
- `GET /wallet/receivables/schedule` para calendário de recebíveis.
- `GET/POST /wallet/receivables` para recebíveis.
- `GET/POST /withdrawals` para saques.
- `POST /withdrawals/:id/approve` e `POST /withdrawals/:id/decline` para suporte/admin.
- `GET/POST /disputes`, `POST /disputes/:id/respond`, `POST /admin/disputes/:id/release` e `POST /admin/disputes/:id/refund` para contestação financeira.

### Invariante

Nenhuma página deve recalcular saldo real diretamente. UI consome `Doke.services.wallet`, e o service decide entre repository local e `repositoryBoundary`.

## Sprint 13 — Segurança, permissões e auditoria

A Sprint 13 adiciona uma fronteira de permissões no frontend/mock antes da integração real. O objetivo é evitar que controllers e páginas executem mutações sensíveis sem actor, role e escopo de recurso.

### Camada adicionada

- `assets/js/core/permissions.js` passa a centralizar regras de acesso por recurso.
- `Doke.permissions.assertAdminAction` protege ações de suporte/admin.
- `Doke.permissions.auditSecurityEvent` registra eventos em `doke.security.audit.v1` para diagnóstico mock/local.

### Escopo de recurso

- Pedido: cliente dono, profissional vinculado, suporte/admin.
- Conversa: participantes, pedido vinculado, suporte/admin.
- Notificação: destinatário, suporte/admin.
- Carteira: proprietário, profissional demo no mock, suporte/admin.
- Ações financeiras críticas: somente suporte/admin.

### Próxima etapa backend

Quando API/Supabase entrar, os mesmos contratos devem virar validação server-side com RLS/policies, middleware de role e audit log persistente. O frontend nunca deve ser tratado como fonte de autorização final.

## Sprint 14 — MVP real controlado antes de backend amplo

A Sprint 14 adiciona um gate de prontidão para impedir que a base avance para backend real amplo sem provar o fluxo ponta a ponta e as negações críticas.

### Gate obrigatório

```bash
npm run audit:mvp-controlled-readiness
```

Esse gate verifica que:

1. `mock` permanece como provider seguro por padrão.
2. `api` continua condicionado a `apiBaseUrl` e `enableNetworkRequests`.
3. Auth, identidade/perfil, pedidos, mensagens, notificações e carteira possuem fronteira de service/provider.
4. Ações sensíveis passam por `Doke.permissions`.
5. Páginas, controllers e renderers não chamam endpoints Doke diretamente.
6. Os cenários críticos do MVP controlado estão registrados em contrato runtime.

### Cenários mínimos antes de teste real

- Cliente cria pedido, profissional aceita, envia proposta/cobrança, cliente paga, carteira mantém garantia, suporte libera repasse, profissional saca e comprovante/auditoria ficam vinculados.
- Cliente contesta, profissional responde, suporte libera repasse ao profissional.
- Cliente contesta, profissional responde, suporte reembolsa cliente.
- Profissional solicita saque, suporte aprova.
- Profissional solicita saque, suporte recusa com motivo.
- Cliente comum tenta ação admin e é bloqueado com auditoria.
- Profissional tenta acessar pedido/carteira fora do escopo e é bloqueado com auditoria.

### Regra para Sprint 15/backend real

A próxima integração real não deve abrir carteira/pagamento em produção antes de existir RLS/policies, idempotência server-side, auditoria server-side e validação de participante para pedidos/conversas.

## Sprint 15 — Preparação Supabase/API real com RLS, seeds e idempotência

A Sprint 15 cria os artefatos de backend necessários para validar o MVP controlado em um ambiente Supabase local/staging sem ativar tráfego real no frontend.

### Artefatos adicionados

- `supabase/migrations/004_mvp_backend_security_foundation.sql`: roles alinhadas ao contrato frontend, tabelas financeiras operacionais, idempotência, recibos, disputas, saques, recebíveis e auditoria admin server-side.
- `supabase/seed/002_mvp_controlled_seed.sql`: contas locais `cliente@doke.local`, `profissional@doke.local`, `suporte@doke.local` e `admin@doke.local`, além de pedido, conversa, carteira, disputa, saque, recibo e notificações demo.
- `backend/shared/contracts/api-actions.json`: mapa de ações server-side com roles, escopo, idempotência e auditoria obrigatória.
- `docs/SUPABASE-BACKEND-READINESS.md`: checklist vivo de readiness Supabase.

### Tabelas críticas novas

- `api_idempotency_keys`
- `receipts`
- `wallet_receivables`
- `withdrawals`
- `payment_disputes`
- `dispute_events`
- `admin_audit_events`

### Regra de ativação

Mesmo com esses artefatos, o frontend continua em `mock` por padrão. Provider `api` só deve ser habilitado depois de validar RLS/policies, idempotência e auditoria em staging.

### Gate obrigatório

```bash
npm run audit:supabase-backend-readiness
```

## Sprint 16 — Supabase local/staging validation + API endpoint skeleton

A Sprint 16 transforma os contratos da Sprint 15 em uma malha de endpoints server-side ainda não conectada a framework/runtime. A intenção é permitir validação de rota, role, escopo, idempotência e auditoria antes de implementar Supabase Edge Functions, Express/Fastify ou API routes.

### Artefatos adicionados

- `backend/shared/http/route-registry.js`: registro canônico dos endpoints do MVP controlado.
- `backend/shared/http/create-action-handler.js`: wrapper neutro para autorização, idempotência e auditoria.
- `backend/shared/http/module-route-loader.js`: loader para os módulos de rota.
- `backend/shared/security/backend-permission-contract.js`: contrato de permissão server-side.
- `backend/shared/security/idempotency-contract.js`: contrato de `x-idempotency-key`.
- `backend/shared/security/audit-event-contract.js`: payload canônico de auditoria.
- `supabase/tests/001_rls_matrix_validation.sql`: matriz inicial de RLS local/staging.
- `supabase/tests/002_idempotency_and_audit_validation.sql`: smoke de idempotência e auditoria.
- `supabase/tests/003_policy_negative_cases.sql`: casos negativos por role.
- `docs/API-ENDPOINT-READINESS.md` e `docs/SUPABASE-LOCAL-STAGING-VALIDATION.md`.

### Gate obrigatório

```bash
npm run audit:api-endpoint-readiness
```

### Regra de ativação

Mesmo com endpoints registrados, eles são skeletons controlados e retornam `DOKE_ENDPOINT_NOT_IMPLEMENTED` até um runtime server-side real implementar cada `execute()`. O frontend permanece em `mock` até staging validar RLS, idempotência e auditoria.

## Sprint 17 — Initial staging runtime

Sprint 17 binds the Sprint 16 route registry to a staging runtime but only implements auth/identity endpoints. This lets the project validate Supabase credentials, bearer-token actor resolution and enriched user/profile DTOs without migrating orders, messages, notifications or wallet yet.

Activation remains opt-in:

- `DOKE_ENABLE_STAGING_API=1`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `DOKE_ENABLE_SERVICE_ROLE=1` and `SUPABASE_SERVICE_ROLE_KEY` only for service-role actions.

Frontend production still defaults to mock. The first frontend API test should use `authProvider=api` with `dataProvider=mock` after staging auth endpoints pass.

## Sprint 18 — Orders runtime in staging

A Sprint 18 implementa o primeiro domínio operacional além de auth/identity no runtime staging: pedidos.

### Escopo implementado

- `GET /orders`
- `GET /orders/:id`
- `POST /orders`
- `POST /orders/:id/accept`
- `POST /orders/:id/decline`
- `POST /orders/:id/quote`
- `POST /orders/:id/charge`
- `POST /orders/:id/start`
- `POST /orders/:id/complete`
- `POST /orders/:id/status`

### Regras

- Cliente cria e lê apenas pedidos próprios.
- Profissional só age em pedidos atribuídos ao próprio usuário.
- Suporte/admin podem ler e atualizar status diretamente em staging.
- Mutations continuam exigindo `x-idempotency-key` pelo wrapper de rota.
- Mensagens, notificações e carteira permanecem fora do runtime real nesta sprint.

### Gate obrigatório

```bash
npm run audit:staging-orders-runtime
npm run audit:staging-runtime-readiness
npm run audit:api-endpoint-readiness
```

## Sprint 19 — Messaging runtime in staging

A Sprint 19 implementa o domínio de conversas/mensagens no runtime staging depois de auth/identity e pedidos.

### Escopo implementado

- `GET /conversations`
- `GET /conversations/:id`
- `POST /orders/:id/conversation`
- `POST /conversations/:id/order`
- `POST /conversations/:id/messages`
- `POST /conversations/:id/read`

### Regras

- Cliente só acessa conversas onde é `client_id`.
- Profissional só acessa conversas onde é `professional_id`.
- Suporte/admin podem acessar conversas com service-role em staging.
- Criar conversa por pedido exige escopo de participante do pedido ou operador interno.
- Atualizar vínculo de pedido exige participantes compatíveis.
- Notificações e carteira permanecem fora do runtime real nesta sprint.

### Gate obrigatório

```bash
npm run audit:staging-messaging-runtime
npm run audit:staging-orders-runtime
npm run audit:staging-runtime-readiness
npm run audit:api-endpoint-readiness
```

## Sprint 20 — Notifications runtime in staging

A Sprint 20 implementa o domínio de notificações no runtime staging depois de auth/identity, pedidos e conversas.

### Escopo implementado

- `GET /notifications`
- `GET /notifications/:id`
- `POST /notifications`
- `PATCH /notifications/:id`
- `POST /notifications/:id/read`
- `POST /notifications/:id/dismiss`
- `POST /notifications/read-all`

### Regras

- Cliente/profissional só acessa notificações onde `user_id` corresponde ao próprio usuário.
- Suporte/admin usam service-role em staging para criar, atualizar e inspecionar notificações.
- Dispensa usa `data.dismissed`, `data.dismissedAt` e `data.dismissedBy`, preservando a tabela atual.
- Criar/atualizar notificações exige `x-idempotency-key` pelo wrapper de rota.
- Carteira permanece fora do runtime real nesta sprint.

### Gate obrigatório

```bash
npm run audit:staging-notifications-runtime
npm run audit:staging-messaging-runtime
npm run audit:staging-orders-runtime
npm run audit:staging-runtime-readiness
npm run audit:api-endpoint-readiness
```

## Sprint 21 — Wallet/finance runtime in staging

A Sprint 21 implementa o domínio de carteira/financeiro no runtime staging depois de auth, pedidos, conversas e notificações.

### Escopo implementado

- `GET /wallet`
- `GET /wallet/transactions`
- `GET /wallet/dashboard`
- `GET /wallet/monthly-history`
- `GET /wallet/receivables/schedule`
- `GET /wallet/bank-account`
- `POST /wallet/bank-account`
- `GET /wallet/receivables`
- `POST /wallet/receivables`
- `GET /withdrawals`
- `POST /withdrawals`
- `POST /withdrawals/:id/approve`
- `POST /withdrawals/:id/decline`
- `GET /disputes`
- `POST /disputes`
- `POST /disputes/:id/respond`
- `POST /admin/disputes/:id/release`
- `POST /admin/disputes/:id/refund`
- `GET /receipts`
- `GET /receipts/:id`
- `GET /admin/audit-events`

### Regras

- Profissional só acessa a própria carteira.
- Cliente só abre contestação em pedido próprio.
- Profissional só responde contestação vinculada a ele.
- Suporte/admin usam service-role em staging para resolver saques, contestação e auditoria.
- Mutações financeiras exigem `x-idempotency-key`.
- Eventos críticos gravam `admin_audit_events` quando o service-role está configurado.

### Gate obrigatório

```bash
npm run audit:staging-wallet-runtime
npm run audit:staging-notifications-runtime
npm run audit:staging-messaging-runtime
npm run audit:staging-orders-runtime
npm run audit:staging-runtime-readiness
npm run audit:api-endpoint-readiness
```

## Sprint 22 — Supabase local/staging E2E validation gate

Sprint 22 does not enable production API traffic. It adds the executable gate that must pass before frontend API activation:

1. Apply migrations and seed in local/staging.
2. Run SQL validations `001`, `002`, `003`.
3. Run `npm run audit:staging-e2e-validation`.
4. Run `npm run validate:staging-e2e:dry-run`.
5. Run `DOKE_STAGING_API_URL=... DOKE_STAGING_E2E_ALLOW_MUTATIONS=1 npm run validate:staging-e2e`.
6. Run `psql "$SUPABASE_DB_URL" -f supabase/tests/004_runtime_e2e_postconditions.sql`.

The gate covers auth, identity, orders, messaging, notifications, wallet/finance and audit paths using real seeded tokens. Any failure blocks `authProvider=api` or `dataProvider=api` frontend rollout.

## Sprint 23 — idempotency and audit hardening before canary

Before enabling `authProvider=api` or `dataProvider=api` in the frontend canary, staging must pass `audit:runtime-idempotency-audit`. Runtime mutations now persist idempotency claims, store successful responses for replay, reject payload drift, and write audit rows for critical actions.

Canary remains blocked until:

1. `api_idempotency_keys` contains succeeded rows with response bodies;
2. same key + same payload replays safely;
3. same key + different payload returns `DOKE_IDEMPOTENCY_CONFLICT`;
4. `admin_audit_events` links audited actions to the idempotency key;
5. service-role configuration is present in staging for idempotency/audit stores.

## Sprint 24 — Supabase local/staging execution

Sprint 24 adds the first operational command for running the backend stack against a real local/staging Supabase instance. The frontend remains on mock providers. The required pass sequence is `audit:supabase-local-staging-execution`, `validate:supabase-local-staging:dry-run`, then `validate:supabase-local-staging` with explicit mutation consent and staging environment variables.
