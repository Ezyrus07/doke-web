# Staging E2E validation — Sprint 22

Sprint 22 adds the executable validation gate for the first real Supabase local/staging pass. It does not enable production API traffic and it does not switch the frontend provider to `api`.

## Objective

Validate the runtime chain against a real local/staging Supabase project before the frontend is allowed to consume API data:

```txt
Auth → Identity → Orders → Messaging → Notifications → Wallet/Finance → Audit
```

## Required order

```bash
supabase start
supabase db reset
psql "$SUPABASE_DB_URL" -f supabase/tests/001_rls_matrix_validation.sql
psql "$SUPABASE_DB_URL" -f supabase/tests/002_idempotency_and_audit_validation.sql
psql "$SUPABASE_DB_URL" -f supabase/tests/003_policy_negative_cases.sql
npm run audit:staging-e2e-validation
npm run validate:staging-e2e:dry-run
```

Only after those steps are clean, run the mutating HTTP smoke:

```bash
DOKE_STAGING_API_URL="https://staging-api.example.local" \
DOKE_STAGING_E2E_ALLOW_MUTATIONS=1 \
npm run validate:staging-e2e
```

Then inspect database postconditions:

```bash
psql "$SUPABASE_DB_URL" -f supabase/tests/004_runtime_e2e_postconditions.sql
```

## Environment

Seed defaults are used when explicit credentials are not provided:

```txt
cliente@doke.local / Doke1234!
profissional@doke.local / Doke1234!
suporte@doke.local / Doke1234!
admin@doke.local / Doke1234!
```

Override with:

```bash
DOKE_STAGING_CLIENT_EMAIL=...
DOKE_STAGING_CLIENT_PASSWORD=...
DOKE_STAGING_PROFESSIONAL_EMAIL=...
DOKE_STAGING_PROFESSIONAL_PASSWORD=...
DOKE_STAGING_SUPPORT_EMAIL=...
DOKE_STAGING_SUPPORT_PASSWORD=...
DOKE_STAGING_ADMIN_EMAIL=...
DOKE_STAGING_ADMIN_PASSWORD=...
```

Optional seeded IDs:

```bash
DOKE_STAGING_ORDER_ID=...
DOKE_STAGING_CONVERSATION_ID=...
DOKE_STAGING_NOTIFICATION_ID=...
DOKE_STAGING_WITHDRAWAL_ID=...
DOKE_STAGING_DISPUTE_ID=...
```

## What the runner validates

- Login/session/profile for client, professional, support and admin.
- Client/professional/support order reads.
- Professional order mutation requires `x-idempotency-key`.
- Client is denied from professional order actions.
- Conversation list, send message and mark read.
- Notification list/read/dismiss and support-created notification.
- Wallet summary, transactions and bank account reads.
- Professional withdrawal request and client withdrawal denial.
- Dispute and receipt read surfaces.
- Support audit list and client audit denial.

## Activation gate

Do not enable frontend API provider until all are true:

- `npm run audit:staging-e2e-validation` passes.
- `npm run validate:staging-e2e` passes against staging.
- `supabase/tests/004_runtime_e2e_postconditions.sql` returns the expected rows.
- Idempotency claims are persisted in `api_idempotency_keys`.
- Sensitive support/finance actions produce `admin_audit_events`.
- No service-role key is present in browser-visible files or runtime config.

## Explicit non-goals

- Do not enable frontend API provider in production.
- Do not bypass RLS to make the smoke pass.
- Do not seed production with demo users.
- Do not treat dry-run output as a real Supabase validation.

## Sprint 23 — persistent idempotency and runtime audit gate

Sprint 23 upgrades the staging E2E gate from header-only idempotency to persistent idempotency. Mutating routes with `x-idempotency-key` must now persist a claim in `api_idempotency_keys`, store the successful response body, replay the same response for the same actor/action/payload, and reject payload drift with `DOKE_IDEMPOTENCY_CONFLICT`.

Additional gate command:

```bash
npm run audit:runtime-idempotency-audit
```

Additional SQL postcondition:

```bash
psql "$SUPABASE_DB_URL" -f supabase/tests/005_runtime_idempotency_audit_replay_validation.sql
```

The runtime smoke now validates `idempotency.replay_same_payload` and `idempotency.reject_payload_drift` before any frontend API canary is allowed.

## Sprint 24 — wrapped Supabase execution

Sprint 24 wraps the SQL preflight, runtime E2E and SQL postconditions in one guarded command:

```bash
npm run audit:supabase-local-staging-execution
npm run validate:supabase-local-staging:dry-run
```

The mutating execution still requires `DOKE_SUPABASE_VALIDATION_ALLOW_MUTATIONS=1` and `DOKE_STAGING_E2E_ALLOW_MUTATIONS=1`. The frontend provider must remain `mock` until the wrapper passes against local/staging.
