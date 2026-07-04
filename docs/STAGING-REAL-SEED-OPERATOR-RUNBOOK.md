# Staging Real Seed Operator Runbook

Purpose: operate staging seed binding only after environment, URL markers, and explicit confirmations are present.

Commands:

```bash
npm run audit:staging-real-seed-operator
npm run execute:staging-real-seed-operator:dry-run
npm run execute:staging-real-seed-operator:check-env
npm run execute:staging-real-seed-operator:report
```

Required environment for real execution:

```bash
DOKE_ENVIRONMENT=staging
DOKE_STAGING_API_URL=https://staging-api.example
DOKE_SUPABASE_DB_URL=postgres://staging...
DOKE_STAGING_SEED_BINDER_CONFIRM=bind-staging-seeds
DOKE_STAGING_SEED_BINDER_EXECUTE=1
DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE=1
DOKE_SUPABASE_SQL_TESTS_ALLOW_MUTATIONS=1
```

Do not use production URLs. The binder requires local, staging, preview, sandbox, or similar safe markers.
