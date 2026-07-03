# API endpoint readiness — Sprint 16

Sprint 16 adds a framework-neutral backend endpoint skeleton for the controlled MVP without enabling production API traffic from the frontend.

## Current status

- Frontend provider default remains `mock`.
- API provider still requires `apiBaseUrl` and `enableNetworkRequests`.
- Backend route handlers are registered but intentionally return `DOKE_ENDPOINT_NOT_IMPLEMENTED` until a real runtime binds Supabase/server logic.
- Supabase migrations/seeds remain reviewable assets until local/staging validation passes.

## Server-side endpoint authorities

| Asset | Responsibility |
| --- | --- |
| `backend/shared/http/route-registry.js` | Canonical route list for auth, identity, orders, messaging, notifications, wallet, disputes, withdrawals, receipts and admin audit. |
| `backend/shared/http/create-action-handler.js` | Framework-neutral route handler wrapper with permission, idempotency and audit hooks. |
| `backend/shared/http/module-route-loader.js` | Loads registered module route handlers for a future HTTP runtime. |
| `backend/shared/security/backend-permission-contract.js` | Server-side role gate contract. Frontend permissions are advisory only. |
| `backend/shared/security/idempotency-contract.js` | `x-idempotency-key` enforcement for sensitive mutations. |
| `backend/shared/security/audit-event-contract.js` | Audit payload contract for support/admin and financial actions. |
| `backend/shared/database/supabase-service-client.js` | Runtime-injected Supabase service-role client factory. |

## Module route handlers

Each module exposes `routes`, `handlers` and `listRouteDefinitions()`:

- `backend/modules/auth/route-handlers.js`
- `backend/modules/orders/route-handlers.js`
- `backend/modules/messaging/route-handlers.js`
- `backend/modules/notifications/route-handlers.js`
- `backend/modules/wallet/route-handlers.js`
- `backend/modules/admin/route-handlers.js`

Handlers are intentionally not connected to a web framework yet. The next sprint can bind these handlers to Supabase Edge Functions, an API route layer, or a Node server without redefining endpoint contracts.

## Critical rules

1. Browser code must not perform privileged mutations directly against tables.
2. Financial and support/admin actions must include `x-idempotency-key`.
3. Server actions must write audit events for actions marked `auditRequired`.
4. Service-role mutations are allowed only through backend runtime code.
5. RLS remains the final data gate even when route guards pass.

## Endpoint groups

- Auth: `/auth/login`, `/auth/register`, `/auth/session`, `/auth/logout`, `/auth/recovery`, `/auth/reset-password`.
- Identity: `/users/me`, `/profiles/me`.
- Orders: `/orders`, `/orders/:id`, `/orders/:id/accept`, `/orders/:id/decline`, `/orders/:id/quote`, `/orders/:id/charge`, `/orders/:id/start`, `/orders/:id/complete`, `/orders/:id/status`.
- Messaging: `/conversations`, `/conversations/:id`, `/orders/:id/conversation`, `/conversations/:id/order`, `/conversations/:id/messages`, `/conversations/:id/read`.
- Notifications: `/notifications`, `/notifications/:id`, `/notifications/:id/read`, `/notifications/:id/dismiss`, `/notifications/read-all`.
- Wallet: `/wallet`, `/wallet/transactions`, `/wallet/dashboard`, `/wallet/monthly-history`, `/wallet/receivables/schedule`, `/wallet/bank-account`, `/wallet/receivables`, `/withdrawals`, `/disputes`, `/receipts`.
- Admin/support: `/admin/disputes/:id/release`, `/admin/disputes/:id/refund`, `/withdrawals/:id/approve`, `/withdrawals/:id/decline`, `/admin/audit-events`.

## Validation command

```bash
npm run audit:api-endpoint-readiness
```

Run this with the existing readiness gates before wiring a runtime:

```bash
npm run audit:api-endpoint-readiness
npm run audit:supabase-backend-readiness
npm run audit:mvp-controlled-readiness
npm run audit:security-permission-contract
```

## Sprint 17 runtime binding status

The staging runtime now executes the auth/identity subset while keeping all other endpoints behind controlled not-implemented responses.

Implemented in staging:

- `POST /auth/login`
- `GET /auth/session`
- `POST /auth/logout`
- `GET /users/me`
- `PATCH /users/me`
- `GET /profiles/me`
- `PATCH /profiles/me`

Runtime binding assets:

- `backend/runtime/staging/staging-api-runtime.js`
- `backend/runtime/staging/fetch-adapter.js`
- `backend/shared/auth/supabase-actor-resolver.js`
- `backend/modules/auth/identity-service.js`

Validation command:

```bash
npm run audit:staging-runtime-readiness
```

## Sprint 18 orders runtime status

The orders runtime is now implemented in staging. The handlers live in:

- `backend/modules/orders/route-handlers.js`
- `backend/modules/orders/orders-service.js`

The orders runtime covers `GET /orders`, `GET /orders/:id`, `POST /orders`, professional mutations and support/admin direct status updates. This layer uses route guards plus per-order scope checks before reading or mutating Supabase rows. It does not migrate messaging, notifications or wallet execution yet.

Validation command:

```bash
npm run audit:staging-orders-runtime
```

## Sprint 19 messaging runtime status

The messaging runtime is now implemented in staging. The handlers live in:

- `backend/modules/messaging/route-handlers.js`
- `backend/modules/messaging/messaging-service.js`

The messaging runtime covers list/get conversation, create conversation for order, sync order context, send message and mark read. This layer uses route guards plus participant/support scope checks before reading or mutating Supabase rows. It does not migrate notifications or wallet execution yet.

Validation command:

```bash
npm run audit:staging-messaging-runtime
```

## Sprint 20 notifications runtime status

The notifications runtime is now implemented in staging. The handlers live in:

- `backend/modules/notifications/route-handlers.js`
- `backend/modules/notifications/notifications-service.js`

The notifications runtime covers list/get notification, create/update by internal operator, mark read, dismiss and read-all. This layer uses route guards plus recipient/support scope checks before reading or mutating Supabase rows. It does not migrate wallet execution yet.

Validation command:

```bash
npm run audit:staging-notifications-runtime
```

## Sprint 21 wallet runtime status

The wallet runtime is now implemented in staging. The handlers live in:

- `backend/modules/wallet/route-handlers.js`
- `backend/modules/wallet/wallet-service.js`
- `backend/modules/admin/route-handlers.js`

The wallet runtime covers wallet summary, transactions, dashboard, receivables, bank account, withdrawals, disputes, receipts and admin audit events. This layer uses route guards plus owner/participant/support scope checks before reading or mutating Supabase rows.

Validation command:

```bash
npm run audit:staging-wallet-runtime
```

## Sprint 22 staging E2E validation status

The endpoint registry is now covered by the local/staging E2E validation gate:

- `backend/shared/testing/staging-e2e-scenarios.js` defines the canonical runtime smoke scenarios.
- `scripts/validate-staging-e2e.js` executes the HTTP smoke with real seeded tokens.
- `scripts/audit-staging-e2e-validation.js` validates the presence of the scenario contract, runner, SQL postconditions and documentation.
- `supabase/tests/004_runtime_e2e_postconditions.sql` checks persistent database signals after the HTTP smoke.

Validation command:

```bash
npm run audit:staging-e2e-validation
npm run validate:staging-e2e:dry-run
```

The mutating command `validate:staging-e2e` must only run against local/staging with `DOKE_STAGING_E2E_ALLOW_MUTATIONS=1`.

## Sprint 23 endpoint gate

Endpoint readiness now includes persistent idempotency. Any route with `idempotencyRequired` must be able to claim, complete and replay `api_idempotency_keys` through the runtime before frontend API canary traffic is allowed. Payload drift must return `DOKE_IDEMPOTENCY_CONFLICT`; audit-required routes must write `admin_audit_events` or fail closed.

## Sprint 24 local/staging execution gate

Endpoint readiness is not considered canary-ready until `audit:supabase-local-staging-execution` and `validate:supabase-local-staging` pass. The gate binds endpoint contracts, SQL tests 001-005, persistent idempotency replay and staging E2E into a single execution report.
