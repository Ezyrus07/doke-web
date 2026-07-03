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
