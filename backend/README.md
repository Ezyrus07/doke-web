# backend — estrutura-alvo

Pasta para API, domínio, jobs/workers e integrações server-side.

Enquanto o projeto estiver estático/Supabase client, esta pasta documenta e prepara a arquitetura futura sem ativar tráfego real.

## Sprint 16 route skeleton

A Sprint 16 adiciona um registro server-side framework-neutral para os endpoints do MVP controlado:

- `backend/shared/http/route-registry.js`: nomes, métodos, paths, módulos, roles, escopos, idempotência e auditoria.
- `backend/shared/http/create-action-handler.js`: wrapper de handler com autorização, `x-idempotency-key` e hook de auditoria.
- `backend/shared/http/module-route-loader.js`: loader de módulos.
- `backend/modules/*/route-handlers.js`: handlers registrados por domínio.

Os handlers ainda não implementam mutações reais. Eles são contratos para o runtime futuro. A próxima etapa deve escolher a camada de execução, como Supabase Edge Functions, API routes ou Node server.

## Regra crítica

Nenhuma chave service-role pode ir para o browser. Mutação financeira/suporte deve ser executada no backend, com RLS, idempotência e auditoria persistente.

## Sprint 17 staging runtime

The first executable runtime binding lives under `backend/runtime/staging/`.

It is staging-only and currently implements auth/identity endpoints:

- `POST /auth/login`
- `GET /auth/session`
- `POST /auth/logout`
- `GET /users/me`
- `PATCH /users/me`
- `GET /profiles/me`
- `PATCH /profiles/me`

Required validation:

```bash
npm run audit:staging-runtime-readiness
npm run audit:api-endpoint-readiness
npm run audit:supabase-backend-readiness
```

Required environment for runtime use:

```bash
DOKE_ENABLE_STAGING_API=1
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

Service-role routes remain disabled unless `DOKE_ENABLE_SERVICE_ROLE=1` and `SUPABASE_SERVICE_ROLE_KEY` are explicitly set in a server-only environment.

## Sprint 18 orders runtime

The staging runtime now executes the orders module. Implemented routes:

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

Order mutations are still staging-only, require the route wrapper idempotency gate where registered, and rely on order-level client/professional/support scope checks.

Required validation:

```bash
npm run audit:staging-orders-runtime
npm run audit:staging-runtime-readiness
```

## Sprint 19 messaging runtime

Staging now implements conversation/message handlers through `backend/modules/messaging/messaging-service.js`. This covers list/get conversation, create conversation for order, sync order metadata, send message and mark read. Notifications and wallet remain gated for later runtime sprints.

## Sprint 21 wallet/finance runtime

The staging runtime now includes wallet/finance handlers. The runtime remains staging-only and still requires `DOKE_ENABLE_STAGING_API=1`.

Required validation:

```bash
npm run audit:staging-wallet-runtime
```

Apply `supabase/migrations/005_wallet_runtime_foundation.sql` in local/staging before testing `GET /wallet/bank-account` or `POST /wallet/bank-account`.

## Sprint 22 staging E2E validation

Sprint 22 adds an executable local/staging validation gate for the current backend runtime.

Assets:

- `backend/shared/testing/staging-e2e-scenarios.js`
- `scripts/validate-staging-e2e.js`
- `scripts/audit-staging-e2e-validation.js`
- `docs/STAGING-E2E-VALIDATION.md`
- `supabase/tests/004_runtime_e2e_postconditions.sql`

Run static/dry validation first:

```bash
npm run audit:staging-e2e-validation
npm run validate:staging-e2e:dry-run
```

Run the real mutating smoke only in local/staging:

```bash
DOKE_STAGING_API_URL="https://staging-api.example.local" \
DOKE_STAGING_E2E_ALLOW_MUTATIONS=1 \
npm run validate:staging-e2e
```

The frontend must not switch to API mode until the HTTP smoke and SQL postconditions pass.

## Sprint 23 persistent idempotency and audit

The staging runtime now uses `backend/shared/security/persistent-idempotency-store.js` for idempotent mutations. Routes requiring idempotency or audit need a server-side service-role client. Same key + same actor/action/payload replays the stored response; same key with payload drift fails with `DOKE_IDEMPOTENCY_CONFLICT`.

Validation:

```bash
npm run audit:runtime-idempotency-audit
npm run validate:staging-e2e:dry-run
```

## Sprint 24 Supabase execution gate

Sprint 24 adds the operational wrapper for the first real local/staging Supabase validation pass:

```bash
npm run audit:supabase-local-staging-execution
npm run validate:supabase-local-staging:dry-run
```

Real execution requires `SUPABASE_DB_URL`, `DOKE_STAGING_API_URL`, `DOKE_SUPABASE_VALIDATION_ALLOW_MUTATIONS=1` and `DOKE_STAGING_E2E_ALLOW_MUTATIONS=1`:

```bash
npm run validate:supabase-local-staging
```

The command runs static backend gates, SQL RLS/idempotency/policy tests, `validate:staging-e2e`, runtime postconditions and writes an execution report. The frontend remains on mock providers until this gate passes.

## Sprint 24 Supabase staging runbook

Sprint 24 adds the preferred operational wrapper for the first real local/staging Supabase validation pass:

```bash
npm run audit:supabase-staging-validation-runbook
npm run validate:supabase-staging:dry-run
npm run validate:supabase-staging:plan
```

The executable runner is `scripts/run-supabase-staging-validation.js`. It fails closed unless `DOKE_ENVIRONMENT` is `local` or `staging`, mutation flags are explicit, and database/API targets include a local/staging marker or an explicit `DOKE_STAGING_VALIDATION_MARKER`.

Full validation keeps the frontend on mock and runs SQL tests 001-005 around `npm run validate:staging-e2e`. This is the final gate before Sprint 25 auth/identity canary work.

## Sprint 27 — Auth/identity local canary runtime

Before pointing the frontend auth/identity canary to external staging, run the local HTTP network gate:

```bash
npm run audit:auth-identity-canary-local-runtime
npm run validate:auth-identity-canary:local-runtime
```

The command starts `backend/shared/testing/auth-identity-canary-local-server.js`, points the existing canary validator to `127.0.0.1`, and verifies only `/auth/login`, `/auth/session`, `/users/me`, and `/profiles/me`. It does not authorize `dataProvider=api` or any domain API canary.

## Sprint 28 — Auth/identity promotion gate

Before any new domain canary, run the promotion gate:

```bash
npm run audit:auth-identity-canary-promotion-gate
npm run validate:auth-identity-canary:promotion-gate
```

For strict promotion, provide a real local/staging report and require it:

```bash
DOKE_AUTH_IDENTITY_CANARY_REQUIRE_REAL_REPORT=1 \
DOKE_AUTH_IDENTITY_CANARY_REAL_REPORT_PATH=reports/generated/auth-identity-canary-report.json \
npm run validate:auth-identity-canary:promotion-gate
```

If the report is missing, the gate reports `blocked_until_real_auth_identity_canary_report`. That state is acceptable for local preflight but not for advancing to orders, messaging, notifications, wallet, disputes, receipts or admin API canaries.

## Sprint 29 — Orders read-only canary local runtime

A Sprint 29 adiciona um servidor local restrito para validar o canary de leitura de pedidos sem usar staging externo:

```bash
npm run validate:orders-readonly-canary:local-runtime
```

O harness local permite apenas auth/identity e leitura de pedidos:

```txt
POST /auth/login
GET /auth/session
GET /users/me
GET /profiles/me
GET /orders
GET /orders/:id
```

Execução real de `npm run validate:orders-readonly-canary:report` continua bloqueada até o relatório de Auth/Identity indicar `auth_identity_canary_ready_for_manual_staging_rollout`.

## Sprint 30 — Orders read-only promotion gate

A Sprint 30 adiciona o gate de promoção para leitura de pedidos. Ele roda os contratos locais anteriores e avalia o relatório real:

```bash
npm run audit:orders-readonly-canary-promotion-gate
npm run validate:orders-readonly-canary:promotion-gate
```

Sem `reports/generated/orders-readonly-canary-report.json`, o status esperado é:

```txt
blocked_until_real_orders_readonly_canary_report
```

Com relatório real válido, o status é:

```txt
orders_readonly_canary_ready_for_manual_write_canary_planning
```

Para CI estrito:

```bash
DOKE_ORDERS_READONLY_CANARY_REQUIRE_REAL_REPORT=1 npm run validate:orders-readonly-canary:promotion-gate
```

Esse gate não ativa escrita. A próxima etapa deve continuar bloqueada por idempotência, rollback e escopo explícito.


## Sprint 31 — Orders write canary planning gate

A Sprint 31 adiciona apenas um gate de planejamento para escrita de pedidos. Ela não executa `POST /orders`, não chama ações mutáveis e não troca `dataProvider` para API. O status seguro sem relatório real de leitura continua sendo `blocked_until_real_orders_readonly_promotion_report`.

Comandos:

```bash
npm run audit:orders-write-canary-planning-gate
npm run validate:orders-write-canary:planning-gate:dry-run
npm run validate:orders-write-canary:planning-gate
```

Status aprovado para planejamento manual:

```txt
orders_write_canary_ready_for_manual_contract_design
```

A escrita futura deve exigir `idempotency_key_required_for_every_mutation`, replay seguro para mesma key/payload, conflito para mesma key com payload diferente e rollback para `dataProvider=mock`.

## Sprint 32 — Orders write local harness

A Sprint 32 adiciona um servidor local controlado para validar escrita de pedidos sem staging real:

```bash
npm run audit:orders-write-canary-local-runtime
npm run validate:orders-write-canary:local-runtime
```

O servidor local fica em `backend/shared/testing/orders-write-canary-local-server.js` e valida `POST /orders` e ações mutáveis de pedidos com `x-idempotency-key` obrigatório, replay seguro e `DOKE_IDEMPOTENCY_CONFLICT` para payload divergente.

O contrato continua `writeActivation=false` e `dataProvider=mock`; nenhuma escrita é ativada no frontend.

Status local aprovado: `orders_write_canary_local_runtime_validated`.

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

## Orders write staging executor — Sprint 34-36

The staging executor is available for manual, flagged orders write canary execution:

```bash
npm run audit:orders-write-canary-staging-executor
npm run execute:orders-write-canary:staging:dry-run
npm run execute:orders-write-canary:staging:check-env
```

Real execution requires explicit network, mutation, and execute flags. Promotion and frontend activation planning remain blocked until real reports are generated.

## Orders write frontend runtime — Sprint 37-39

O backend continua protegido por gates. O frontend ganhou um contrato de ativação manual para `ordersProvider=api-write-canary-frontend-activation`, validado por harness local/browser, mantendo `dataProvider=mock`.

Comandos principais:

```bash
npm run validate:orders-write-frontend-activation:runtime
npm run validate:orders-write-frontend-rollback:gate
```

A ativação real ainda depende dos relatórios de staging e de flags explícitas. Nenhum domínio fora de `/orders` é ativado por este contrato.

## Sprint 40–48 — Backend real domain canary closure

The backend test harness now includes Messaging, Notifications and Wallet in addition to Auth/Identity and Orders. Use:

```bash
npm run audit:backend-domain-canary-runtime
npm run validate:backend-domain-canary:local-runtime
npm run audit:backend-real-staging-preflight-gate
npm run validate:backend-real:staging-preflight-gate
npm run audit:backend-real-complete-readiness-gate
npm run validate:backend-real:complete-readiness-gate
```

The local runtime validates idempotency, replay, conflict and role gates without external network. Real staging remains blocked until explicit URL/flags and required reports exist.

## Sprint 49–60 backend-real operational layer

This block adds:

- local complete E2E backend runtime;
- multi-domain staging executor;
- observability gate;
- domain expansion readiness gate for Anunciar, Publicar and Comunidade.

All real staging execution remains manual, flag-gated and blocked by upstream reports.

## Sprint 61–75 — domain expansion backend-real preparation
Foram adicionados harness/gates para próximos domínios de produto:

- service listings / anunciar;
- publications / publicar;
- community / comunidade.

O runtime local é `backend/shared/testing/domain-expansion-e2e-local-server.js` e não realiza rede externa.

## Sprint 76–90 — Product beta backend-real contracts

Added local runtime and staging gates for media/uploads, moderation, search/indexing and pricing/boost. These domains are safe local harnesses only; real staging remains gated by explicit environment variables and reports.

## Sprint 91–105 — Beta launch operations

Adds local runtime and staging executor contracts for payments/checkout/escrow, KYC, support/admin and security/abuse prevention. The new launch readiness gate remains blocked until real reports and staging prerequisites are available.

## Sprint 106–120 private beta launch integration

This sprint adds frontend-controlled beta launch activation and release-candidate gates. It does not enable production, does not store credentials, and does not change HTML/CSS. Use the validation commands in `docs/VALIDATION.md` before any manual release candidate packaging.
