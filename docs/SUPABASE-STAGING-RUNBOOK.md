# Supabase staging runbook — Sprint 24

Sprint 24 turns the previous Supabase readiness plan into an executable local/staging validation gate. The goal is operational proof, not frontend activation.

## Objective

Validate the backend runtime against a real local or staging Supabase target before any canary API provider is allowed in the browser:

```txt
migrations → seeds → SQL tests 001–005 → staging E2E → idempotency replay → admin audit persistence
```

Do not enable frontend API provider during this sprint. The Doke Web frontend must stay on mock/localStorage until every gate below passes in a real local/staging environment.

## Commands

Static/audit pass:

```bash
npm run audit:supabase-staging-validation-runbook
npm run validate:supabase-staging:dry-run
npm run validate:supabase-staging:plan
```

Environment-only check:

```bash
DOKE_ENVIRONMENT=local \
DOKE_SUPABASE_DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
DOKE_STAGING_API_URL="http://127.0.0.1:54321/functions/v1/doke-api" \
DOKE_SUPABASE_VALIDATION_ALLOW_MUTATIONS=1 \
DOKE_SUPABASE_SQL_TESTS_ALLOW_MUTATIONS=1 \
DOKE_STAGING_E2E_ALLOW_MUTATIONS=1 \
npm run validate:supabase-staging:check-env
```

Full local pass with reset:

```bash
DOKE_ENVIRONMENT=local \
DOKE_SUPABASE_DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
DOKE_STAGING_API_URL="http://127.0.0.1:54321/functions/v1/doke-api" \
DOKE_SUPABASE_VALIDATION_ALLOW_MUTATIONS=1 \
DOKE_SUPABASE_SQL_TESTS_ALLOW_MUTATIONS=1 \
DOKE_STAGING_E2E_ALLOW_MUTATIONS=1 \
npm run validate:supabase-staging -- --local-reset --write-report
```

Full staging pass without reset:

```bash
DOKE_ENVIRONMENT=staging \
DOKE_SUPABASE_DB_URL="postgresql://..." \
DOKE_STAGING_API_URL="https://staging-api.example.local" \
DOKE_STAGING_VALIDATION_MARKER=staging \
DOKE_SUPABASE_VALIDATION_ALLOW_MUTATIONS=1 \
DOKE_SUPABASE_SQL_TESTS_ALLOW_MUTATIONS=1 \
DOKE_STAGING_E2E_ALLOW_MUTATIONS=1 \
npm run validate:supabase-staging -- --write-report
```

`DOKE_STAGING_VALIDATION_MARKER=staging` exists for staging database/API URLs whose host does not literally contain `staging`, `stage`, `stg` or `preview`. It is still blocked if the URL looks production-like.

## Runner modes

The operational runner is `scripts/run-supabase-staging-validation.js`.

| Mode | Command | Mutates data | Purpose |
| --- | --- | --- | --- |
| `dry-run` | `npm run validate:supabase-staging:dry-run` | No | Lists required files, SQL tests, gates and command plan. |
| `check-env` | `npm run validate:supabase-staging:check-env` | No | Validates local/staging env, mutation flags and target markers. |
| `print-plan` | `npm run validate:supabase-staging:plan` | No | Prints the execution plan without env checks. |
| `run-sql-tests` | `npm run validate:supabase-staging:sql-tests` | Yes | Runs SQL tests 001–005 with explicit SQL mutation consent. |
| `run-e2e` | `npm run validate:supabase-staging:e2e` | Yes | Runs staging E2E audit and `validate:staging-e2e`. |
| `full` | `npm run validate:supabase-staging` | Yes | Runs static audits, SQL preflight, staging E2E and SQL postconditions. |

## Required environment

Real execution modes require:

```txt
DOKE_ENVIRONMENT=local or staging
DOKE_SUPABASE_DB_URL=postgresql://...
DOKE_STAGING_API_URL=https://...
DOKE_SUPABASE_VALIDATION_ALLOW_MUTATIONS=1
DOKE_SUPABASE_SQL_TESTS_ALLOW_MUTATIONS=1
DOKE_STAGING_E2E_ALLOW_MUTATIONS=1
```

`SUPABASE_DB_URL` remains supported as a fallback for compatibility with earlier Sprint 24 scripts, but `DOKE_SUPABASE_DB_URL` is the preferred operational variable.

## Safety rules

The runner fails closed when:

- `DOKE_ENVIRONMENT` is not exactly `local` or `staging`;
- `--local-reset` is used outside `DOKE_ENVIRONMENT=local`;
- SQL mode lacks `DOKE_SUPABASE_VALIDATION_ALLOW_MUTATIONS=1` or `DOKE_SUPABASE_SQL_TESTS_ALLOW_MUTATIONS=1`;
- E2E mode lacks `DOKE_STAGING_E2E_ALLOW_MUTATIONS=1`;
- database/API URLs look production-like;
- a target lacks a local/staging marker and no explicit `DOKE_STAGING_VALIDATION_MARKER` is supplied;
- any required migration, seed, SQL test or E2E contract file is missing.

## Required SQL tests

The runner blocks if any of these files is missing:

1. `supabase/tests/001_rls_matrix_validation.sql`
2. `supabase/tests/002_idempotency_and_audit_validation.sql`
3. `supabase/tests/003_policy_negative_cases.sql`
4. `supabase/tests/004_runtime_e2e_postconditions.sql`
5. `supabase/tests/005_runtime_idempotency_audit_replay_validation.sql`

## Release gate

Frontend canary API work is allowed only after all are true:

- migrations 001–006 applied successfully;
- seeds applied successfully;
- SQL tests 001–005 pass;
- `npm run validate:staging-e2e` passes in real local/staging;
- idempotency replay with same payload passes;
- idempotency conflict with different payload passes;
- `api_idempotency_keys` stores `request_hash` and `response_body`;
- `admin_audit_events` persists support/finance audit rows;
- RLS negative cases deny cross-scope access;
- `authProvider` and `dataProvider` remain mock in the frontend.

## Expected report

With `--write-report`, the runner writes:

```txt
reports/generated/staging-validation-report.json
```

The report is an operational artifact. Do not treat generated reports as source-of-truth architecture and avoid committing them unless a release process explicitly requests it.

## Next sprint

Sprint 25 should be Canary API Auth/Identity in staging only:

```txt
authProvider=api
dataProvider=mock
```

Pedidos, mensagens, notificações and carteira remain mock until auth/session/users/me/profiles/me pass and rollback to mock is confirmed.
