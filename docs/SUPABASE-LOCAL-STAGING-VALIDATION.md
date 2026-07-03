# Supabase local/staging validation — Sprint 16

This document defines the minimum validation plan before any Doke frontend runtime can use `dataProvider = 'api'` or `authProvider = 'api'` with real users.

## Principle

The browser is not a trusted authority. Supabase RLS, server route guards, idempotency and audit writes must pass in local/staging before any production traffic is enabled.

## Local setup sequence

```bash
supabase start
supabase db reset
npm run audit:supabase-backend-readiness
npm run audit:api-endpoint-readiness
```

Then apply the SQL validation scripts manually or through the chosen Supabase test runner:

```bash
psql "$SUPABASE_DB_URL" -f supabase/tests/001_rls_matrix_validation.sql
psql "$SUPABASE_DB_URL" -f supabase/tests/002_idempotency_and_audit_validation.sql
psql "$SUPABASE_DB_URL" -f supabase/tests/003_policy_negative_cases.sql
```

## RLS matrix

Validate each role:

| Role | Must access | Must be denied |
| --- | --- | --- |
| `client` | own profile, own orders, own conversations, own notifications, own receipts | admin audit queue, other client orders, support decisions, withdrawal approvals |
| `professional` | assigned orders, assigned conversations, own wallet, own withdrawals, own receipts | other professional wallet, client-only dispute open for unrelated orders, support decisions |
| `support` | operational queues, disputes, withdrawals, audit events | direct user password/session mutation outside auth runtime |
| `admin` | all support queues and administrative audit | bypassing idempotency on financial actions |

## Idempotency validation

For every financial/support action:

- repeat the same `x-idempotency-key` and payload;
- assert only one canonical result exists;
- assert duplicate requests do not duplicate receipts, receivables, withdrawals or audit rows;
- assert a reused key with a different request hash is rejected.

Actions requiring this validation:

- `orders.accept`
- `orders.decline`
- `disputes.open`
- `disputes.respond`
- `disputes.release`
- `disputes.refund`
- `withdrawals.request`
- `withdrawals.approve`
- `withdrawals.decline`

## Staging acceptance checklist

- Migrations apply from a clean database.
- Seed creates client, professional, support and admin demo users.
- RLS denies cross-scope reads and mutations.
- Support/admin actions require internal role.
- Sensitive mutations require `x-idempotency-key`.
- Audit rows are written by backend runtime, not by browser-only state.
- Receipts are generated once per financial outcome.
- Frontend still defaults to `mock` unless runtime flags explicitly enable API.

## Do not proceed if

- any RLS test requires disabling policies;
- service-role key is exposed to browser code;
- duplicate requests create duplicate financial outcomes;
- support/admin decisions are possible from client/professional tokens;
- audit events can be forged by non-internal users.

## Sprint 17 runtime smoke checks

After local/staging migration and seed validation, bind the staging runtime with `DOKE_ENABLE_STAGING_API=1`, `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

Minimum HTTP checks:

```bash
# Login with seeded client user.
curl -X POST "$DOKE_STAGING_API_URL/auth/login" \
  -H 'content-type: application/json' \
  -d '{"email":"cliente@doke.local","password":"Doke1234!"}'

# Use the returned token.
curl "$DOKE_STAGING_API_URL/auth/session" -H "authorization: Bearer $TOKEN"
curl "$DOKE_STAGING_API_URL/users/me" -H "authorization: Bearer $TOKEN"
curl "$DOKE_STAGING_API_URL/profiles/me" -H "authorization: Bearer $TOKEN"
```

Expected result:

- client receives only the client identity/profile;
- professional receives professional profile metadata;
- support/admin identities resolve roles correctly;
- unauthenticated calls to `/auth/session`, `/users/me` and `/profiles/me` are denied;
- unimplemented non-auth endpoints return controlled `DOKE_ENDPOINT_NOT_IMPLEMENTED`, not runtime crashes.

## Sprint 22 — Runtime E2E validation

After the Sprint 21 runtime is available, run the HTTP validation gate before switching any frontend provider to API:

```bash
npm run audit:staging-e2e-validation
npm run validate:staging-e2e:dry-run
DOKE_STAGING_API_URL="https://staging-api.example.local" \
DOKE_STAGING_E2E_ALLOW_MUTATIONS=1 \
npm run validate:staging-e2e
psql "$SUPABASE_DB_URL" -f supabase/tests/004_runtime_e2e_postconditions.sql
```

`validate:staging-e2e` logs in as client, professional, support and admin using the seeded users or explicit `DOKE_STAGING_*` credentials. The command intentionally requires `DOKE_STAGING_E2E_ALLOW_MUTATIONS=1` because it creates or mutates staging orders, messages, notifications, withdrawals and audit records.

The frontend must remain on `mock` until the HTTP validation and SQL postconditions pass together.

## Sprint 23 — idempotency replay validation

After applying migrations through `006_runtime_idempotency_audit_foundation.sql`, run the HTTP staging smoke and then:

```bash
psql "$SUPABASE_DB_URL" -f supabase/tests/005_runtime_idempotency_audit_replay_validation.sql
```

Expected result: persisted `api_idempotency_keys` rows with `status = 'succeeded'`, non-empty `request_hash`, stored `response_body`, and linked `admin_audit_events` for sensitive audited actions.

## Sprint 24 — executable local/staging execution gate

Sprint 24 adds the operational wrapper for the real Supabase local/staging pass. The gate does not enable the frontend API provider and does not run by default in mutation mode.

Dry run:

```bash
npm run audit:supabase-local-staging-execution
npm run validate:supabase-local-staging:dry-run
```

Real local/staging execution requires explicit mutation consent:

```bash
SUPABASE_DB_URL="postgresql://..." \
DOKE_STAGING_API_URL="https://staging-api.example.local" \
DOKE_SUPABASE_VALIDATION_ALLOW_MUTATIONS=1 \
DOKE_STAGING_E2E_ALLOW_MUTATIONS=1 \
npm run validate:supabase-local-staging
```

For a clean local database, add `-- --local-reset` to run `supabase start` and `supabase db reset` before the audits and SQL tests:

```bash
SUPABASE_DB_URL="postgresql://..." \
DOKE_STAGING_API_URL="http://127.0.0.1:54321/functions/v1/doke-api" \
DOKE_SUPABASE_VALIDATION_ALLOW_MUTATIONS=1 \
DOKE_STAGING_E2E_ALLOW_MUTATIONS=1 \
npm run validate:supabase-local-staging -- --local-reset
```

The execution gate runs SQL tests 001 through 005 around the HTTP smoke:

1. `supabase/tests/001_rls_matrix_validation.sql`
2. `supabase/tests/002_idempotency_and_audit_validation.sql`
3. `supabase/tests/003_policy_negative_cases.sql`
4. `npm run validate:staging-e2e`
5. `supabase/tests/004_runtime_e2e_postconditions.sql`
6. `supabase/tests/005_runtime_idempotency_audit_replay_validation.sql`

A JSON report is written to `reports/generated/supabase-local-staging-execution-report.json` during execution, or to the path specified by `DOKE_SUPABASE_VALIDATION_REPORT`.

Do not enable frontend API provider until `audit:supabase-local-staging-execution`, `validate:supabase-local-staging` and the generated execution report all pass.
