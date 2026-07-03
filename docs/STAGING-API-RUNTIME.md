# Staging API runtime — Sprint 17

Sprint 17 introduces the first backend runtime binding for staging. It is intentionally limited: the frontend still defaults to `mock`, and production API traffic remains disabled until Supabase/RLS/idempotency checks pass.

## Scope implemented

The runtime now binds the Sprint 16 route registry to executable handlers for the identity surface:

- `POST /auth/login`
- `GET /auth/session`
- `POST /auth/logout`
- `GET /users/me`
- `PATCH /users/me`
- `GET /profiles/me`
- `PATCH /profiles/me`

Other domains remain registered but return controlled `DOKE_ENDPOINT_NOT_IMPLEMENTED` until their server actions are implemented in later sprints.

## Runtime assets

| Asset | Responsibility |
| --- | --- |
| `backend/runtime/staging/staging-runtime-config.js` | Reads and validates staging-only runtime flags and Supabase credentials. |
| `backend/runtime/staging/staging-api-runtime.js` | Framework-neutral runtime that matches method/path, resolves actor, injects Supabase clients and calls route handlers. |
| `backend/runtime/staging/fetch-adapter.js` | Optional Fetch API adapter for Edge Function / Request-compatible hosts. |
| `backend/shared/auth/supabase-actor-resolver.js` | Resolves the current actor from a bearer token and the `public.users` role row. |
| `backend/modules/auth/identity-service.js` | Reads and normalizes `users`, `user_profiles`, `client_profiles` and `professional_profiles`. |

## Required environment

The runtime is disabled unless staging explicitly enables it:

```bash
DOKE_ENABLE_STAGING_API=1
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

Privileged routes that declare `serviceRoleRequired` also require:

```bash
DOKE_ENABLE_SERVICE_ROLE=1
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The service-role key must never be exposed to browser code.

## Minimal runtime binding

A Node/Edge-compatible host can inject the Supabase client factory:

```js
const { createClient } = require('@supabase/supabase-js');
const { createFetchHandler } = require('./backend/runtime/staging/fetch-adapter');

const handleRequest = createFetchHandler({
  createClient,
  env: process.env
});
```

## Acceptance checks before frontend API auth

1. Apply migrations and seed in Supabase local/staging.
2. Run the SQL validation scripts under `supabase/tests/`.
3. Run:

```bash
npm run audit:staging-runtime-readiness
npm run audit:api-endpoint-readiness
npm run audit:supabase-backend-readiness
npm run audit:mvp-controlled-readiness
```

4. Validate `POST /auth/login`, `GET /auth/session`, `GET /users/me` and `GET /profiles/me` with the seeded users.
5. Only then test the frontend with `authProvider=api`, `dataProvider=mock` and network requests enabled.

## Explicit non-goals

- Do not enable production API traffic.
- Do not migrate orders, messages, notifications or wallet runtime behavior yet.
- Do not expose service-role keys to the frontend.
- Do not bypass RLS to make frontend testing easier.

## Sprint 18 — Orders runtime binding

The staging runtime now executes the first order domain subset while still keeping messaging, notifications and wallet behind the existing provider gates.

Implemented in staging:

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

Access rules:

- client reads and creates only own orders;
- professional reads and mutates only orders assigned to that professional;
- support/admin can read orders and can use the direct status endpoint;
- mutating routes continue to require `x-idempotency-key` through the route wrapper.

Validation command:

```bash
npm run audit:staging-orders-runtime
```

Manual staging checks after migrations and seed:

```txt
1. Login as cliente@doke.local and call GET /orders.
2. Login as profissional@doke.local and call GET /orders.
3. Login as profissional@doke.local and call POST /orders/:id/accept with x-idempotency-key.
4. Try the same professional action without x-idempotency-key and confirm DOKE_IDEMPOTENCY_REQUIRED.
5. Try a client token against POST /orders/:id/accept and confirm DOKE_FORBIDDEN.
6. Login as suporte@doke.local and call POST /orders/:id/status with x-idempotency-key.
```

## Sprint 19 — Messaging runtime binding

The staging runtime now executes the messaging/conversation subset while keeping notifications and wallet behind the existing provider gates.

Implemented in staging:

- `GET /conversations`
- `GET /conversations/:id`
- `POST /orders/:id/conversation`
- `POST /conversations/:id/order`
- `POST /conversations/:id/messages`
- `POST /conversations/:id/read`

Access rules:

- client reads and writes only conversations where `client_id` matches the actor;
- professional reads and writes only conversations where `professional_id` matches the actor;
- support/admin can read and coordinate conversations through the service-role client in staging;
- creating a conversation for an order requires order participant/support scope;
- `POST /orders/:id/conversation` and `POST /conversations/:id/order` continue to require `x-idempotency-key` through the route wrapper.

Validation command:

```bash
npm run audit:staging-messaging-runtime
```

Manual staging checks after migrations and seed:

```txt
1. Login as cliente@doke.local and call GET /conversations.
2. Login as profissional@doke.local and call GET /conversations.
3. Login as cliente@doke.local and call POST /conversations/:id/messages.
4. Login as profissional@doke.local and call POST /conversations/:id/read.
5. Try a client token against a conversation outside scope and confirm DOKE_FORBIDDEN or RLS-denied empty result.
6. Login as suporte@doke.local and call GET /conversations with service-role enabled.
```

## Sprint 20 — Notifications runtime binding

The staging runtime now executes the notifications subset while keeping wallet/finance behind the existing provider gates.

Implemented in staging:

- `GET /notifications`
- `GET /notifications/:id`
- `POST /notifications`
- `PATCH /notifications/:id`
- `POST /notifications/:id/read`
- `POST /notifications/:id/dismiss`
- `POST /notifications/read-all`

Access rules:

- client/professional users read and mutate only notifications where `user_id` matches the actor;
- support/admin can create, update and inspect notifications through the service-role client in staging;
- dismissed state is stored in notification `data` so the existing table shape remains compatible;
- create/update routes continue to require `x-idempotency-key` through the route wrapper.

Validation command:

```bash
npm run audit:staging-notifications-runtime
```

Manual staging checks after migrations and seed:

```txt
1. Login as profissional@doke.local and call GET /notifications.
2. Login as profissional@doke.local and call POST /notifications/:id/read.
3. Login as profissional@doke.local and call POST /notifications/:id/dismiss.
4. Try a different client/professional token against the same notification and confirm DOKE_FORBIDDEN or an RLS-denied empty result.
5. Login as suporte@doke.local and call POST /notifications with x-idempotency-key.
6. Login as suporte@doke.local and call PATCH /notifications/:id with x-idempotency-key.
```

## Sprint 21 — Wallet/finance runtime binding

The staging runtime now executes the wallet/finance subset after auth, orders, messaging and notifications.

Implemented in staging:

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

Access rules:

- professionals read and mutate only their own wallet, withdrawals, bank account and receivables;
- clients open disputes only for orders where they are the client;
- professionals respond only to disputes where they are the professional;
- support/admin resolve withdrawals, disputes, receivables and audit through the service-role client in staging;
- sensitive mutations continue to require `x-idempotency-key` through the route wrapper;
- audit-required routes write to `admin_audit_events` when a service-role client is available.

Validation command:

```bash
npm run audit:staging-wallet-runtime
```

Manual staging checks after migrations and seed:

```txt
1. Login as profissional@doke.local and call GET /wallet.
2. Login as profissional@doke.local and call POST /wallet/bank-account with x-idempotency-key.
3. Login as profissional@doke.local and call POST /withdrawals with x-idempotency-key.
4. Login as cliente@doke.local and call POST /disputes with x-idempotency-key for an owned order.
5. Login as profissional@doke.local and call POST /disputes/:id/respond with x-idempotency-key.
6. Login as suporte@doke.local and call POST /withdrawals/:id/approve with x-idempotency-key.
7. Login as suporte@doke.local and call POST /admin/disputes/:id/refund with x-idempotency-key.
8. Login as suporte@doke.local and call GET /admin/audit-events.
```

## Sprint 22 — Supabase local/staging E2E validation gate

The staging runtime now has an executable validation gate before frontend API activation.

Validation assets:

- `backend/shared/testing/staging-e2e-scenarios.js`
- `scripts/validate-staging-e2e.js`
- `scripts/audit-staging-e2e-validation.js`
- `docs/STAGING-E2E-VALIDATION.md`
- `supabase/tests/004_runtime_e2e_postconditions.sql`

Commands:

```bash
npm run audit:staging-e2e-validation
npm run validate:staging-e2e:dry-run
DOKE_STAGING_API_URL="https://staging-api.example.local" DOKE_STAGING_E2E_ALLOW_MUTATIONS=1 npm run validate:staging-e2e
```

This gate must run only against local/staging data. It validates auth, identity, orders, messaging, notifications, wallet/finance and audit paths with real tokens and runtime responses.

Do not enable frontend API provider until this gate and the SQL postconditions pass.

## Sprint 23 — persistent idempotency and audit runtime behavior

Sprint 23 hardens staging runtime mutations with persistent idempotency and audit persistence. Any route marked with `idempotencyRequired` or `auditRequired` now requires a server-side service-role client in staging. Without it, the runtime returns `DOKE_SERVICE_ROLE_UNAVAILABLE` before executing the handler.

Runtime behavior:

- claim `api_idempotency_keys` before mutation;
- compute a stable request hash from actor, route, params and body;
- replay the stored response for the same key and same payload;
- reject the same key with another actor/action/payload using `DOKE_IDEMPOTENCY_CONFLICT`;
- mark failed claims as `failed` when execution errors;
- write default audit rows to `admin_audit_events` for audit-required routes that do not provide a custom recorder;
- fail audit-required routes with `DOKE_AUDIT_STORE_UNAVAILABLE` when no audit store is available.

This is required before canary API activation because support/admin and financial actions cannot depend on browser-side de-duplication.

## Sprint 24 Supabase execution wrapper

Use `validate:supabase-local-staging` to run the staging runtime against a real local/staging Supabase project after migrations and seeds are available. The command is guarded by `DOKE_SUPABASE_VALIDATION_ALLOW_MUTATIONS=1`, runs the SQL test gate around `validate:staging-e2e`, and writes a report under `reports/generated/`.
