# Supabase backend readiness

Sprint 15 prepares the controlled MVP for a real Supabase/API backend without enabling production traffic from the frontend.

## Current status

- Frontend provider default remains `mock`.
- API mode still requires `apiBaseUrl` and `enableNetworkRequests`.
- Supabase migrations and seeds are reviewable artifacts, not an automatic production deploy.
- Financial and support operations must be enforced server-side before real money movement.

## Supabase assets

| Asset | Responsibility |
| --- | --- |
| `supabase/migrations/004_mvp_backend_security_foundation.sql` | Adds support/admin role alignment, idempotency, receipts, receivables, withdrawals, disputes, admin audit events and RLS. |
| `supabase/seed/002_mvp_controlled_seed.sql` | Seeds local demo client, professional, support and admin users plus a full controlled MVP order/wallet/dispute/withdrawal dataset. |
| `backend/shared/contracts/api-actions.json` | Documents server actions, role scope, idempotency and audit requirements. |
| `scripts/audit-supabase-backend-readiness.js` | Static gate that verifies Supabase/backend readiness assets remain present and aligned. |

## Required backend invariants

1. **Frontend authorization is advisory only.** Supabase RLS and server actions must be the final gate.
2. **Sensitive financial actions are idempotent.** Dispute release/refund and withdrawal approve/decline require an idempotency key.
3. **Support/admin actions are audited.** Any support/admin decision must create an audit event with actor, role, entity and metadata.
4. **Participants own their data.** Clients and professionals can read only resources they participate in; support/admin can read operational queues.
5. **Receipts are backend-generated.** Frontend can display receipts, but must not manufacture authoritative receipt codes in production.

## Minimum RLS coverage

- `users`, `user_profiles`, `professional_profiles`, `client_profiles`
- `orders`, `budgets`, `conversations`, `messages`, `notifications`
- `wallets`, `transactions`, `wallet_receivables`, `withdrawals`, `payment_disputes`, `receipts`
- `api_idempotency_keys`, `dispute_events`, `admin_audit_events`

## Local validation order

```bash
npm run audit:supabase-backend-readiness
npm run audit:mvp-controlled-readiness
npm run audit:security-permission-contract
npm run audit:wallet-api-contract
npm run audit:orders-api-contract
npm run audit:messages-api-contract
npm run audit:notifications-api-contract
```

## Before enabling backend traffic

Do not enable `Doke.runtimeConfig.dataProvider = 'api'` for real users until:

- migrations have been applied in a staging Supabase project;
- RLS policies are tested for client, professional, support and admin;
- seed users are replaced with real test accounts;
- financial server actions are implemented with service-role-only mutations;
- idempotency is validated under repeated requests;
- audit events are written by the backend, not by browser state alone.

## Sprint 16 — Endpoint skeleton and local/staging tests

Sprint 16 adds the backend route registry and validation scripts required before implementing a real API runtime.

Additional assets:

| Asset | Responsibility |
| --- | --- |
| `backend/shared/http/route-registry.js` | Canonical list of backend endpoints, roles, scope, idempotency and audit requirements. |
| `backend/shared/http/create-action-handler.js` | Framework-neutral handler wrapper for authorization, idempotency and audit hooks. |
| `backend/modules/*/route-handlers.js` | Domain route handler exports. They are registered but intentionally not implemented yet. |
| `supabase/tests/001_rls_matrix_validation.sql` | Local/staging RLS matrix smoke script. |
| `supabase/tests/002_idempotency_and_audit_validation.sql` | Idempotency and audit smoke script. |
| `supabase/tests/003_policy_negative_cases.sql` | Manual negative cases for client/professional/support/admin tokens. |
| `scripts/audit-api-endpoint-readiness.js` | Static gate that verifies route registry, server-action alignment and docs. |

Additional gate:

```bash
npm run audit:api-endpoint-readiness
```

The endpoint skeleton does not enable backend traffic. Real handler implementation must occur only after Supabase local/staging validation passes.

## Sprint 22 — HTTP runtime validation before frontend API activation

After Sprint 21 runtime handlers exist, Supabase readiness must include the HTTP validation gate:

```bash
npm run audit:staging-e2e-validation
npm run validate:staging-e2e:dry-run
DOKE_STAGING_API_URL="https://staging-api.example.local" DOKE_STAGING_E2E_ALLOW_MUTATIONS=1 npm run validate:staging-e2e
psql "$SUPABASE_DB_URL" -f supabase/tests/004_runtime_e2e_postconditions.sql
```

This gate confirms that RLS, route guards, idempotency headers, finance/admin audit and seeded identities work together through the staging runtime, not only through isolated SQL checks.
