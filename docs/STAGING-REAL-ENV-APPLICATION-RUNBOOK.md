# Staging Real Environment Application Runbook

## Objective

Validate and apply real staging environment variables to the staging seed operator without hardcoding secrets.

## Commands

```bash
npm run audit:staging-real-env-application
npm run execute:staging-real-env-application:dry-run
npm run execute:staging-real-env-application:check-env
npm run execute:staging-real-env-application:report
```

## Required environment

```bash
DOKE_ENVIRONMENT=staging
DOKE_STAGING_API_URL=https://staging-api.example
DOKE_SUPABASE_DB_URL=postgres://USER:PASSWORD@HOST:5432/DB
DOKE_STAGING_SEED_BINDER_CONFIRM=bind-staging-seeds
DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE=1
```

The URL must contain a safe marker such as `staging`, `stg`, `preview`, `sandbox`, `local`, `localhost`, or `127.0.0.1`.

## GO status

```txt
staging_real_env_application_completed
```
