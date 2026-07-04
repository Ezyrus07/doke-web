# Staging Seed Operator Env Runbook

## Objective
Prepare a safe staging seed environment before any real staging mutation.

## Template
Copy from:

```txt
config/staging-seed-operator.env.example
```

Never commit real credentials.

## Required variables

```txt
DOKE_ENVIRONMENT=staging
DOKE_STAGING_API_URL=...
DOKE_SUPABASE_DB_URL=...
DOKE_STAGING_SEED_BINDER_CONFIRM=bind-staging-seeds
DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE=1
```

Wrapper execution requires an additional deliberate flag:

```txt
DOKE_STAGING_SEED_OPERATOR_ENV_RUN=1
```

## Commands

```bash
npm run audit:staging-seed-operator-env
npm run prepare:staging-seed-operator-env:dry-run
npm run prepare:staging-seed-operator-env:check-env
npm run prepare:staging-seed-operator-env:report
```

## Guardrails
- `DOKE_ENVIRONMENT` must be `staging`.
- URLs must include safe markers such as `staging`, `stg`, `preview`, `sandbox`, `localhost`, `127.0.0.1`, or `local`.
- Production-like URLs are rejected.
