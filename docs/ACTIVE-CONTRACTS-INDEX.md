# Índice de contratos ativos

Este arquivo é o ponto de entrada para agentes humanos, ChatGPT, Codex e qualquer automação que trabalhar no Doke.

## Contratos obrigatórios

- `AGENTS.md`: regras práticas para alterações no projeto.
- `PROJECT-RULES.md`: princípios de organização, CSS, HTML e evolução futura.
- `docs/DOKE_AGENT_CONSTITUTION.md`: contrato operacional de alto nível para agentes.
- `docs/ARCHITECTURE.md`: mapa vivo da arquitetura frontend.
- `docs/CSS_AUTHORITY_MAP.md`: autoridade entre core, components, patterns e pages.
- `docs/GLOBAL-LAYOUT-CONTRACT.md`: autoridade de shell, header, rail, largura e scroll.
- `docs/DESIGN-SYSTEM-GUIDE.md`: tokens, componentes, ritmo visual e consistência.
- `docs/FRONTEND-GOVERNANCE.md`: processo de mudança e critérios de aceite.
- `docs/SURFACE-CONTRACT.md`: contrato de superfícies visuais, cards, modais e estados.
- `docs/BASELINE-VISUAL-APPROVED.md`: baseline visual que refatorações devem preservar.
- `docs/DATA-READY-CONTRACTS.md`: preparação para dados reais, renderers e controllers.
- `docs/DATA-MODEL.md`: entidades, status e permissões para backend futuro.
- `docs/FINANCIAL-FLOW-CONTRACT.md`: eventos e efeitos colaterais do ciclo financeiro.
- `docs/API-ADAPTER-CONTRACT.md`: interface de provider mock/API e endpoints-alvo.
- `docs/AUTH-INTEGRATION-CONTRACT.md`: sessão, roles, permissões e transição para autenticação real.
- `docs/BACKEND-INTEGRATION-PLAN.md`: plano seguro de migração para API/Supabase.
- `docs/VALIDATION.md`: comandos e matriz mínima de validação.

## Regra de precedência

Se houver conflito entre documento histórico e documento ativo, vence esta ordem:

1. `docs/DOKE_AGENT_CONSTITUTION.md`
2. `AGENTS.md`
3. `PROJECT-RULES.md`
4. contratos vivos em `docs/`
5. código runtime atual

Documentos de fase, relatórios gerados e arquivos em `reports/` não são fonte de verdade permanente.

## Política para novos documentos

Não criar novo documento permanente para cada etapa. Primeiro atualizar um contrato vivo existente. Só criar documento novo quando a responsabilidade não couber em nenhum contrato atual.

- `docs/AUTH-INTEGRATION-CONTRACT.md`: atualizado na Sprint 12A com provider API controlado para login/cadastro/sessão/logout.

## Sprint 12B

- `assets/js/contracts/identity-profile-contract.js` — contrato runtime de identidade/perfil.
- `docs/AUTH-INTEGRATION-CONTRACT.md` — endpoints `/users/me` e `/profiles/me`, DTO de identidade e regras de sessão enriquecida.


## Sprint 12C

- `Doke.services.orders` — fronteira pública de pedidos para mock/API.
- `assets/js/services/api-repository-provider.js` — endpoints e ações de pedidos.
- `assets/js/repositories/orders-repository.js` — normalização de status backend para tokens visuais atuais.
- `docs/API-ADAPTER-CONTRACT.md` — contrato de endpoints e ações de pedidos.


## Sprint 12D — Messages API provider contract

- `messages` remains mock/localStorage by default and only uses API when `repositoryBoundary` reports active provider `api` with `apiBaseUrl` and `enableNetworkRequests`.
- Conversations use `GET /conversations`, `GET /conversations/:id`, `POST /orders/:id/conversation`, `POST /conversations/:id/order`, `POST /conversations/:id/messages`, and `POST /conversations/:id/read`.
- Pages must call `Doke.services.messages`; renderers must not call `fetch()` or backend endpoints directly.
- System events, charge cards, payment events and dispute events remain messages with typed payloads so the chat history can be migrated without changing UI renderers.

## Sprint 12E — Notifications API provider contract

- `Doke.services.notifications` — fronteira pública de notificações para mock/API.
- `assets/js/services/api-repository-provider.js` — endpoints e ações de notificações.
- `assets/js/repositories/notifications-repository.js` — normalização local, dedupe por `eventKey` e estados `read`/`dismissed`.
- `docs/API-ADAPTER-CONTRACT.md` — contrato de endpoints e ações de notificações.

- `assets/js/services/wallet-service.js`: wallet provider boundary for Sprint 12F; mock remains default and API is gated by repositoryBoundary.
- `scripts/audit-wallet-api-contract.js`: verifies wallet API/provider wiring.

## Sprint 13 — Security, permissions and audit

- `assets/js/core/permissions.js` centraliza autorização frontend/mock por recurso.
- `Doke.permissions.assertAdminAction` protege resolução de contestação, resolução de saque e auditoria administrativa.
- `doke.security.audit.v1` registra eventos mock de segurança e negações locais.
- `npm run audit:security-permission-contract` valida a presença dos contratos críticos.

## Sprint 14 — MVP real controlado e hardening ponta a ponta

- `assets/js/contracts/mvp-controlled-flow-contract.js` define o contrato de fluxo crítico, matriz de roles, cenários de negação e readiness gates do MVP controlado.
- `npm run audit:mvp-controlled-readiness` valida que auth, identidade, pedidos, mensagens, notificações, carteira e permissões continuam atrás das fronteiras de services/providers.
- Páginas, controllers e renderers não podem chamar endpoints Doke diretamente; qualquer backend futuro deve passar por `repositoryBoundary` e pelos services de domínio.
- O MVP controlado só pode avançar para teste real quando os cenários `happy_path_release`, `dispute_release_professional`, `dispute_refund_client`, `withdrawal_approved`, `withdrawal_declined`, `client_admin_denied` e `professional_cross_scope_denied` estiverem validados.

## Sprint 15 — Supabase/API readiness contracts

- `docs/SUPABASE-BACKEND-READINESS.md`: checklist vivo para RLS, seeds, idempotência, recibos e auditoria server-side.
- `supabase/migrations/004_mvp_backend_security_foundation.sql`: migration de preparação para o MVP controlado em Supabase.
- `supabase/seed/002_mvp_controlled_seed.sql`: seed local com cliente, profissional, suporte, admin e fluxo financeiro demo.
- `backend/shared/contracts/api-actions.json`: mapa de actions server-side com roles, escopo, idempotência e auditoria.
- `npm run audit:supabase-backend-readiness`: gate estático da Sprint 15.

## Sprint 16 — API endpoint readiness and Supabase validation

- `docs/API-ENDPOINT-READINESS.md`: contrato vivo do registro de endpoints backend, handlers e idempotência/auditoria.
- `docs/SUPABASE-LOCAL-STAGING-VALIDATION.md`: plano de validação local/staging para RLS, roles, idempotência e negações.
- `backend/shared/http/route-registry.js`: registro server-side canônico dos endpoints do MVP controlado.
- `backend/shared/http/create-action-handler.js`: wrapper neutro para autorização, idempotência e auditoria.
- `supabase/tests/001_rls_matrix_validation.sql`, `002_idempotency_and_audit_validation.sql`, `003_policy_negative_cases.sql`: scripts de validação manual/local.
- `npm run audit:api-endpoint-readiness`: gate estático da Sprint 16.

## Sprint 17 — Staging API runtime auth/identity

- `docs/STAGING-API-RUNTIME.md`: staging runtime contract, environment gates and auth/identity acceptance checks.
- `backend/runtime/staging/staging-api-runtime.js`: method/path route matching, actor resolution and Supabase client injection for staging.
- `backend/runtime/staging/fetch-adapter.js`: Fetch API adapter for Edge/Request-compatible hosts.
- `backend/modules/auth/route-handlers.js`: implemented staging handlers for login, session, logout, `/users/me` and `/profiles/me`.
- `backend/modules/auth/identity-service.js`: identity/profile normalization from Supabase tables.
- `npm run audit:staging-runtime-readiness`: static gate for Sprint 17 runtime readiness.

## Sprint 18 — Orders runtime staging

- `backend/modules/orders/orders-service.js`: contrato operacional server-side de pedidos.
- `backend/modules/orders/route-handlers.js`: handlers reais para `orders.*` no runtime staging.
- `docs/STAGING-API-RUNTIME.md`: checklist atualizado para `/orders`.
- `npm run audit:staging-orders-runtime`: gate da Sprint 18.

## Sprint 19 active contract — Staging messaging runtime

- `backend/modules/messaging/messaging-service.js` is the staging server-side owner for conversation/message reads and mutations.
- `backend/modules/messaging/route-handlers.js` binds route-registry messaging routes to executable handlers.
- Participant scope is enforced before mutation: client by `client_id`, professional by `professional_id`, support/admin by internal operator role with service-role client.
- Required validation: `npm run audit:staging-messaging-runtime`.

## Sprint 20 active contract — Staging notifications runtime

- `backend/modules/notifications/notifications-service.js` is the staging server-side owner for notification reads and mutations.
- `backend/modules/notifications/route-handlers.js` binds route-registry notification routes to executable handlers.
- Recipient scope is enforced before mutation: client/professional by `user_id`, support/admin by internal operator role with service-role client.
- Required validation: `npm run audit:staging-notifications-runtime`.

## Sprint 21 wallet runtime validation

- Runtime: `backend/modules/wallet/wallet-service.js` and `backend/modules/wallet/route-handlers.js`.
- Admin finance routes: `backend/modules/admin/route-handlers.js`.
- Gate: `npm run audit:staging-wallet-runtime`.
- Scope: wallet, transactions, dashboard, receivables, bank accounts, withdrawals, disputes, receipts and admin audit events.

## Sprint 22 active contract — Staging E2E validation

- `backend/shared/testing/staging-e2e-scenarios.js` defines the canonical local/staging smoke scenarios.
- `scripts/validate-staging-e2e.js` executes the mutating HTTP validation with real seeded tokens.
- `scripts/audit-staging-e2e-validation.js` is exposed through `npm run audit:staging-e2e-validation`.
- `supabase/tests/004_runtime_e2e_postconditions.sql` validates database side effects after the HTTP smoke.
- Activation rule: frontend API mode remains blocked until `validate:staging-e2e` and SQL postconditions pass in staging.

## Sprint 23 active contract additions

- `backend/shared/security/persistent-idempotency-store.js` — runtime persistence for idempotency claim, replay, conflict and failure states.
- `supabase/migrations/006_runtime_idempotency_audit_foundation.sql` — SQL helpers/indexes for idempotency completion and failure.
- `supabase/tests/005_runtime_idempotency_audit_replay_validation.sql` — post-smoke validation for replay-safe idempotency and linked audit rows.
- `npm run audit:runtime-idempotency-audit` — static gate for runtime idempotency/audit readiness.

## Sprint 24 local/staging execution contract

- `backend/shared/testing/supabase-execution-gate.js`
- `scripts/validate-supabase-local-staging.js`
- `scripts/audit-supabase-local-staging-execution.js`
- `npm run audit:supabase-local-staging-execution`
- `npm run validate:supabase-local-staging:dry-run`
- `npm run validate:supabase-local-staging`
