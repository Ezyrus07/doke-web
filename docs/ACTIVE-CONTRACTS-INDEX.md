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

## Sprint 24 — Supabase staging validation runbook

- `docs/SUPABASE-STAGING-RUNBOOK.md`: operational source for the local/staging Supabase execution gate.
- `scripts/run-supabase-staging-validation.js`: safe runner with `dry-run`, `check-env`, `print-plan`, `run-sql-tests`, `run-e2e` and `full` modes.
- `scripts/audit-supabase-staging-validation-runbook.js`: static gate for the runbook, env contract, SQL test list and package scripts.
- `npm run audit:supabase-staging-validation-runbook`: validates Sprint 24 orchestration without touching visual/frontend.
- `npm run validate:supabase-staging:dry-run`, `npm run validate:supabase-staging:plan`, `npm run validate:supabase-staging`: preferred commands for the Sprint 24 gate.

The existing mock frontend remains the active user-facing provider until a real local/staging pass is complete and Sprint 25 starts a scoped auth/identity canary.

## Sprint 25 — auth/identity canary

Contrato ativo: `docs/AUTH-IDENTITY-CANARY-RUNBOOK.md`.

Arquivos de autoridade:

- `assets/js/core/runtime-config.js` — reconhece `dokeAuthIdentityCanary`, força `dataProvider=mock` durante o canary e expõe metadados de provider solicitado.
- `assets/js/services/auth-service.js` — expõe `DokeAuth.configureAuthIdentityCanary`, `DokeAuth.getAuthIdentityCanaryStatus` e `DokeAuth.rollbackAuthIdentityCanary`.
- `scripts/validate-auth-identity-canary.js` — smoke real apenas de `/auth/login`, `/auth/session`, `/users/me` e `/profiles/me`.
- `scripts/audit-auth-identity-canary-contract.js` — gate estático do contrato.

Comandos:

```bash
npm run audit:auth-identity-canary-contract
npm run validate:auth-identity-canary:dry-run
npm run validate:auth-identity-canary
```

## Sprint 26 active contract — Auth/identity canary browser runtime gate

- `assets/js/services/auth-service.js` bloqueia ativação de canary Auth/Identity para alvo com aparência de produção e exige marcador local/staging ou `targetMarker` explícito.
- `scripts/validate-auth-identity-canary-browser-runtime.js` valida o contrato de navegador sem rede real: default mock, bloqueio de alvo perigoso, ativação segura, chamadas restritas a auth/identity e rollback.
- Gate obrigatório antes de teste manual no navegador: `npm run validate:auth-identity-canary:browser-runtime`.
- O restante do produto permanece em `dataProvider=mock`; canary de outros domínios continua proibido até o canary Auth/Identity real passar em staging/local.

## Sprint 27 active contract — Auth/identity local network canary

- `backend/shared/testing/auth-identity-canary-local-server.js` fornece um servidor HTTP local e controlado para validar o canary sem depender de credenciais externas.
- `scripts/validate-auth-identity-canary-local-runtime.js` executa o mesmo smoke real `scripts/validate-auth-identity-canary.js` contra `127.0.0.1`.
- `scripts/audit-auth-identity-canary-local-runtime.js` garante que o gate local, os docs e os comandos do `package.json` continuam registrados.
- Comando obrigatório antes do staging real: `npm run validate:auth-identity-canary:local-runtime`.
- O contrato continua `authProvider=api`, `dataProvider=mock`, com chamadas restritas a `/auth/login`, `/auth/session`, `/users/me` e `/profiles/me`.

## Sprint 28 active contract — Auth/identity promotion gate

- `scripts/validate-auth-identity-canary-promotion-gate.js` consolida os gates locais antes da promoção para staging/local real.
- `scripts/audit-auth-identity-canary-promotion-gate.js` garante que comandos, docs e contrato de relatório real estão registrados.
- Comandos: `npm run audit:auth-identity-canary-promotion-gate`, `npm run validate:auth-identity-canary:promotion-gate:dry-run`, `npm run validate:auth-identity-canary:promotion-gate`.
- Flag estrita: `DOKE_AUTH_IDENTITY_CANARY_REQUIRE_REAL_REPORT=1`.
- Relatório esperado: `DOKE_AUTH_IDENTITY_CANARY_REAL_REPORT_PATH` ou `reports/generated/auth-identity-canary-report.json`.
- Sem relatório real válido, o status permanece `blocked_until_real_auth_identity_canary_report` e nenhum canary de pedidos/mensagens/notificações/carteira/admin está autorizado.

## Sprint 29 — contrato ativo de Orders read-only canary

- `docs/ORDERS-READONLY-CANARY-RUNBOOK.md`: runbook do canary de pedidos somente leitura.
- `scripts/audit-orders-readonly-canary-contract.js`: audit estático do contrato.
- `scripts/validate-orders-readonly-canary.js`: validador real/local-staging, bloqueado por Auth/Identity.
- `scripts/validate-orders-readonly-canary-local-runtime.js`: harness local seguro.
- `backend/shared/testing/orders-readonly-canary-local-server.js`: servidor local restrito.

A execução real depende de `auth_identity_canary_ready_for_manual_staging_rollout`. O comando seguro local é `npm run validate:orders-readonly-canary:local-runtime`.

## Sprint 30 — contrato ativo de Orders read-only promotion gate

- `scripts/validate-orders-readonly-canary-promotion-gate.js`: gate que avalia se um relatório real de leitura de pedidos autoriza apenas planejamento manual de escrita.
- `scripts/audit-orders-readonly-canary-promotion-gate.js`: audit estático do gate, comandos e documentação.
- Comandos: `npm run audit:orders-readonly-canary-promotion-gate`, `npm run validate:orders-readonly-canary:promotion-gate:dry-run`, `npm run validate:orders-readonly-canary:promotion-gate`, `npm run validate:orders-readonly-canary:promotion-gate:report`.

Sem relatório real, o status esperado é `blocked_until_real_orders_readonly_canary_report`. Com relatório real válido, o status é `orders_readonly_canary_ready_for_manual_write_canary_planning`. Esse status não ativa escrita; ele só libera planejamento manual do próximo gate.


## Sprint 31 — Orders write canary planning gate

Contrato ativo:

- Script: `scripts/validate-orders-write-canary-planning-gate.js`
- Audit: `scripts/audit-orders-write-canary-planning-gate.js`
- Runbook: `docs/ORDERS-WRITE-CANARY-RUNBOOK.md`
- Comando: `npm run validate:orders-write-canary:planning-gate`

Status seguro sem relatório real:

```txt
blocked_until_real_orders_readonly_promotion_report
```

Status que permite apenas desenho manual:

```txt
orders_write_canary_ready_for_manual_contract_design
```

Salvaguarda obrigatória: `idempotency_key_required_for_every_mutation`.

## Sprint 32 — Orders write local harness

Contrato ativo local-only:

- Server: `backend/shared/testing/orders-write-canary-local-server.js`
- Validator: `scripts/validate-orders-write-canary-local-runtime.js`
- Audit: `scripts/audit-orders-write-canary-local-runtime.js`
- Runbook: `docs/ORDERS-WRITE-CANARY-RUNBOOK.md`
- Command: `npm run validate:orders-write-canary:local-runtime`

Status aprovado: `orders_write_canary_local_runtime_validated`.

A salvaguarda central permanece `writeActivation=false` com `dataProvider=mock`. O harness local valida replay idempotente, `DOKE_IDEMPOTENCY_CONFLICT`, bloqueio de role e domínio restrito a pedidos.

## Sprint 33 — Orders write staging preflight gate

A Sprint 33 adiciona o gate de preflight para uma futura execução real de escrita de pedidos em local/staging. O escopo continua sem alteração visual e sem ativação de escrita no frontend.

Contrato operacional:

```txt
writeActivation=false
dataProvider=mock
ordersProvider=api-write-canary-staging-preflight
performsNetworkRequest=false
performsMutation=false
```

Comandos:

```bash
npm run audit:orders-write-canary-staging-preflight-gate
npm run validate:orders-write-canary:staging-preflight-gate:dry-run
npm run validate:orders-write-canary:staging-preflight-gate:check-env
npm run validate:orders-write-canary:staging-preflight-gate
npm run validate:orders-write-canary:staging-preflight-gate:report
```

Status seguro sem pré-requisitos reais:

```txt
blocked_until_orders_write_staging_preflight_prerequisites
```

Status de alvo inseguro:

```txt
blocked_unsafe_orders_write_staging_target
```

Status aprovado apenas para execução manual futura:

```txt
orders_write_canary_ready_for_manual_staging_execution
```

Variáveis exigidas para aprovação do preflight real:

```bash
DOKE_ENVIRONMENT=staging
DOKE_ORDERS_WRITE_CANARY_STAGING_API_URL=https://staging-api.example
DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_NETWORK=1
DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_MUTATIONS=1
```

Relatórios reais exigidos:

```txt
auth_identity_canary_ready_for_manual_staging_rollout
orders_readonly_canary_ready_for_manual_write_canary_planning
orders_write_canary_ready_for_manual_contract_design
orders_write_canary_local_runtime_validated
```

A aprovação do preflight não executa mutação. Ela apenas confirma que a próxima sprint pode preparar um executor real de staging com confirmação manual, idempotência obrigatória, relatório e rollback para mock.

## Orders write multi-step canary contracts — Sprint 34-36

- `docs/ORDERS-WRITE-STAGING-EXECUTOR-RUNBOOK.md` — manual staging executor contract for orders write canary.
- `docs/ORDERS-WRITE-EXECUTION-PROMOTION-RUNBOOK.md` — promotion gate after real staging execution.
- `docs/ORDERS-WRITE-FRONTEND-ACTIVATION-RUNBOOK.md` — frontend activation planning gate with manual activation only.

## Orders write frontend runtime contracts — Sprint 37-39

- `docs/ORDERS-WRITE-FRONTEND-RUNTIME-RUNBOOK.md` — contrato de ativação manual no runtime do frontend.
- `docs/ORDERS-WRITE-FRONTEND-ROLLBACK-RUNBOOK.md` — contrato de rollback e degradação segura.
- `scripts/validate-orders-write-frontend-activation-runtime.js` — harness browser/local sem rede externa.
- `scripts/validate-orders-write-frontend-rollback-gate.js` — gate de rollback e bloqueio seguro.

Status:

```txt
orders_write_frontend_activation_runtime_validated
orders_write_frontend_rollback_gate_validated
```

## Sprint 40–48 active contracts

- Messaging canary local runtime: `docs/MESSAGING-CANARY-RUNBOOK.md`
- Notifications canary local runtime: `docs/NOTIFICATIONS-CANARY-RUNBOOK.md`
- Wallet canary local runtime: `docs/WALLET-CANARY-RUNBOOK.md`
- Backend real staging preflight: `docs/BACKEND-REAL-STAGING-PREFLIGHT-RUNBOOK.md`
- Backend real complete readiness: `docs/BACKEND-REAL-COMPLETE-READINESS-RUNBOOK.md`

The active provider default is still mock. Real staging is manual-only and report-gated.

## Sprint 49–60 active backend contracts

- `docs/BACKEND-REAL-MULTIDOMAIN-STAGING-RUNBOOK.md`
- `docs/BACKEND-REAL-E2E-RUNBOOK.md`
- `docs/BACKEND-REAL-OBSERVABILITY-RUNBOOK.md`
- `docs/DOMAIN-EXPANSION-RUNBOOK.md`

## Sprint 61–75 — novos contratos ativos
- `docs/SERVICE-LISTINGS-CANARY-RUNBOOK.md`
- `docs/PUBLICATIONS-CANARY-RUNBOOK.md`
- `docs/COMMUNITY-CANARY-RUNBOOK.md`
- `docs/DOMAIN-EXPANSION-E2E-RUNBOOK.md`
- `docs/DOMAIN-EXPANSION-STAGING-RUNBOOK.md`
- `docs/BETA-CLOSED-BACKEND-REAL-READINESS-RUNBOOK.md`

## Sprint 76–90 — Product beta backend-real domains

- `docs/MEDIA-UPLOADS-CANARY-RUNBOOK.md` — media/uploads/attachments contract.
- `docs/MODERATION-CANARY-RUNBOOK.md` — reports, blocks and moderation contract.
- `docs/SEARCH-INDEXING-CANARY-RUNBOOK.md` — unified search and index rebuild contract.
- `docs/PRICING-CANARY-RUNBOOK.md` — plans, subscriptions and boost contract.
- `docs/PRODUCT-BETA-E2E-RUNBOOK.md` — local E2E runtime for product beta domains.
- `docs/PRODUCT-BETA-STAGING-RUNBOOK.md` — guarded staging executor for product beta domains.
- `docs/BETA-CLOSED-PRODUCT-READINESS-RUNBOOK.md` — beta closed product readiness gate.

## Sprint 91–105 active contracts

- `docs/PAYMENTS-ESCROW-CANARY-RUNBOOK.md`
- `docs/KYC-CANARY-RUNBOOK.md`
- `docs/SUPPORT-ADMIN-CANARY-RUNBOOK.md`
- `docs/SECURITY-ABUSE-CANARY-RUNBOOK.md`
- `docs/BETA-LAUNCH-E2E-RUNBOOK.md`
- `docs/BETA-LAUNCH-STAGING-RUNBOOK.md`
- `docs/BETA-CLOSED-LAUNCH-READINESS-RUNBOOK.md`

## Sprint 106–120 — Private beta frontend integration and release candidate readiness

- `docs/BETA-LAUNCH-FRONTEND-RUNTIME-RUNBOOK.md` — controlled frontend activation for beta launch domains with `dataProvider=mock`.
- `docs/BETA-QA-MATRIX-RUNBOOK.md` — QA matrix by persona/domain/scenario for private beta.
- `docs/BETA-QUALITY-GATES-RUNBOOK.md` — accessibility, performance and SEO evidence gate.
- `docs/BETA-VISUAL-HARDENING-RUNBOOK.md` — final visual hardening evidence gate without changing visual in this sprint.
- `docs/RELEASE-CANDIDATE-PACKAGE-RUNBOOK.md` — final release candidate package and rollback gate.

## Sprint 121–135 — Private Beta RC Evidence and Launch Operations

- `docs/LOCAL-EVIDENCE-REPORTS-RUNBOOK.md` — geração de evidências locais sem fingir staging real.
- `docs/STAGING-REAL-PREPARATION-PACKAGE-RUNBOOK.md` — pacote de preparação de staging real com flags e URL segura.
- `docs/PRIVATE-BETA-RELEASE-CHECKLIST.md` — checklist go/no-go sem liberar release com evidência parcial.
- `docs/PRIVATE-BETA-USER-ENTRY-RUNBOOK.md` — entrada controlada de usuários reais por coortes.
- `docs/RELEASE-CANDIDATE-ASSEMBLY-RUNBOOK.md` — montagem do pacote RC com bloqueadores explícitos.

## Sprint 136–150 private beta release gates
- Playwright visual evidence package: `docs/PLAYWRIGHT-VISUAL-EVIDENCE-PACKAGE-RUNBOOK.md`
- Browser quality evidence package: `docs/BETA-BROWSER-QUALITY-EVIDENCE-RUNBOOK.md`
- Staging environment binder: `docs/STAGING-ENV-BINDER-RUNBOOK.md`
- Operator rehearsal: `docs/PRIVATE-BETA-OPERATOR-REHEARSAL-RUNBOOK.md`
- Release go/no-go: `docs/RELEASE-GO-NO-GO-RUNBOOK.md`

## Sprint 151-165 contracts

- `docs/VISUAL-RESPONSIVE-EVIDENCE-EXECUTION-RUNBOOK.md` — executable Playwright/responsive evidence gate.
- `docs/BROWSER-QUALITY-REAL-EVIDENCE-RUNBOOK.md` — accessibility/performance/SEO real-evidence gate.
- `docs/STAGING-SEED-BINDER-RUNBOOK.md` — staging environment + seed checklist binder.
- `docs/PRIVATE-BETA-REAL-REHEARSAL-RUNBOOK.md` — real-evidence operator rehearsal gate.
- `docs/PRIVATE-BETA-GO-LIVE-RUNBOOK.md` — final private beta GO/NO-GO decision gate.

## Sprint 166-180 Private Beta Real GO Attempt

Sprint 166-180 expands the visual manifest to the full private-beta viewport matrix and adds the real GO attempt wrapper:

```bash
npm run audit:private-beta-real-go-attempt
npm run execute:private-beta-real-go-attempt:dry-run
npm run execute:private-beta-real-go-attempt:check-env
npm run execute:private-beta-real-go-attempt:report
```

The expected safe default remains NO-GO until real browser evidence, staging seed binding, rehearsal and manual confirmations pass.


## Sprint 181-195 Evidence Pursuit

- Added Playwright Chromium preparation and system-browser fallback.
- Added capture-only visual evidence spec for real screenshot evidence without rewriting approved baselines.
- Added staging real seed operator and private beta GO pursuit orchestrator.
- GO remains blocked unless real visual, browser quality, staging seeds, rehearsal, and manual confirmation pass.

## Sprint 196-210 — Browser Policy Resolution and Evidence Loop

- `docs/PLAYWRIGHT-BROWSER-POLICY-RESOLUTION-RUNBOOK.md` — resolves system Chromium policy blockers and prefers Playwright-managed Chromium.
- `docs/STAGING-REAL-COMMAND-PACK-RUNBOOK.md` — copy-safe staging command pack with no committed credentials.
- `docs/PRIVATE-BETA-EVIDENCE-LOOP-RUNBOOK.md` — full evidence loop that defaults to NO-GO until all real evidence statuses pass.

## Sprint 211-225 — Real Workstation Evidence and Entry Gate

- `docs/WINDOWS-PLAYWRIGHT-CHROMIUM-WORKSTATION-RUNBOOK.md` — Windows/VS Code commands for Playwright-managed Chromium evidence.
- `docs/VISUAL-EVIDENCE-REVIEW-PACKAGE-RUNBOOK.md` — screenshot/layout evidence review package with manual approval flag.
- `docs/LIGHTHOUSE-A11Y-EVIDENCE-PACKAGE-RUNBOOK.md` — Lighthouse/Core Web Vitals and manual accessibility evidence package.
- `docs/STAGING-SEED-OPERATOR-ENV-RUNBOOK.md` — staging seed environment validator and safe wrapper.
- `docs/PRIVATE-BETA-REAL-ENTRY-GATE-RUNBOOK.md` — final NO-GO-by-default private beta entry gate from real evidence.


## Sprint 226–240 contracts

- `docs/WINDOWS-PRIVATE-BETA-EVIDENCE-BATCH-RUNBOOK.md` — ordered Windows/VS Code execution batch.
- `docs/VISUAL-SCREENSHOT-PACKAGE-RUNBOOK.md` — screenshot completeness and manual review gate.
- `docs/LIGHTHOUSE-A11Y-WORKSTATION-RUNBOOK.md` — Lighthouse/Core Web Vitals and manual accessibility evidence.
- `docs/STAGING-REAL-ENV-APPLICATION-RUNBOOK.md` — real staging env/seeds application gate.
- `docs/PRIVATE-BETA-REAL-ENTRY-REPEAT-RUNBOOK.md` — repeated real-entry GO/NO-GO decision.

## Sprint 241-255 — Private beta evidence interpretation contracts

Active contracts added:

- `docs/PRIVATE-BETA-REPORT-INTERPRETER-RUNBOOK.md`
- `docs/VISUAL-FINDINGS-TRIAGE-RUNBOOK.md`
- `docs/QUALITY-FINDINGS-TRIAGE-RUNBOOK.md`
- `docs/STAGING-EVIDENCE-REVIEW-RUNBOOK.md`
- `docs/PRIVATE-BETA-EVIDENCE-ADJUDICATOR-RUNBOOK.md`

The private beta entry decision remains `NO_GO` unless workstation visual evidence, Lighthouse/a11y evidence, staging evidence, and manual approvals all reach accepted statuses.

## Sprint 256-270 — Private beta evidence resolution contracts

Active contracts added:

- `docs/PRIVATE-BETA-WORKSTATION-REPORT-INGEST-RUNBOOK.md` — ingests Windows/VS Code evidence reports and identifies missing reports.
- `docs/VISUAL-RESOLUTION-BACKLOG-RUNBOOK.md` — converts screenshot/visual triage reports into visual resolution actions without editing UI automatically.
- `docs/QUALITY-RESOLUTION-BACKLOG-RUNBOOK.md` — converts Lighthouse/accessibility evidence into quality resolution actions.
- `docs/STAGING-RESOLUTION-BACKLOG-RUNBOOK.md` — converts staging env/seed evidence into staging actions without storing credentials.
- `docs/PRIVATE-BETA-ENTRY-RESOLUTION-CYCLE-RUNBOOK.md` — repeats entry adjudication after resolution backlogs and stays NO-GO unless all evidence is real and accepted.

The release decision remains `NO_GO` by default. The only acceptable GO path is real workstation browser evidence, real Lighthouse/a11y evidence, real staging evidence, and explicit manual confirmation.

## Sprint 271–285 — Private beta one-command and decision matrices

Active contracts added:

- `docs/WINDOWS-PRIVATE-BETA-ONE-COMMAND-RUNBOOK.md`
- `docs/VISUAL-CORRECTION-MATRIX-RUNBOOK.md`
- `docs/QUALITY-CORRECTION-MATRIX-RUNBOOK.md`
- `docs/STAGING-EXTERNAL-SECRETS-CHECKLIST-RUNBOOK.md`
- `docs/PRIVATE-BETA-ENTRY-DECISION-GATE-RUNBOOK.md`

These contracts convert workstation evidence into explicit visual, quality, staging, and private beta entry decisions.

## Sprint 286-300 — Private beta human RC contracts

- `config/private-beta-simplified-flow.json` defines the shortest safe Windows/VS Code evidence flow.
- `config/private-beta-human-rc-map.json` defines the human RC evidence map and manual approvals.
- `tools/private-beta-simplified-flow.windows.ps1` runs the local evidence phases in order.
- `reports/generated/private-beta-one-screen-summary.md` summarizes GO/NO-GO in one screen.
- `reports/generated/human-release-candidate-package.md` states what still blocks private beta entry.

## Sprint 301–315 — Private Beta Execution Bridge Contracts

- `config/private-beta-execution-bridge-map.json` is the source of truth for the closing execution bridge, required real backend envs, and strategy values.
- `tools/private-beta-execution-bridge.windows.ps1` is the operator path for Windows/VS Code evidence execution.
- `reports/generated/private-beta-operating-dashboard.md` summarizes GO/NO-GO evidence areas.
- `reports/generated/private-beta-short-task-list.md` collapses the current NO-GO into the shortest actionable task list.
- `DOKE_PRIVATE_BETA_STRATEGY=mock-first|real-backend-first` is required before inviting users.
