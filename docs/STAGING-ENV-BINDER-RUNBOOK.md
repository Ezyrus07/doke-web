# Staging Environment Binder Runbook

## Objective
Bind local code to a real staging environment only when the URL, environment and confirmation markers prove that no production target is involved.

## Commands

```bash
npm run audit:staging-environment-binder
npm run validate:staging-environment-binder:dry-run
npm run validate:staging-environment-binder:check-env
npm run validate:staging-environment-binder:report
```

## Required environment variables

```bash
DOKE_ENVIRONMENT=staging
DOKE_STAGING_API_URL=https://staging-api.example
DOKE_SUPABASE_DB_URL=postgres://...
DOKE_STAGING_BINDER_CONFIRM=bind-staging-environment
```

## Production guard
The binder blocks URLs that look like production or that do not contain a local/staging marker such as `localhost`, `127.0.0.1`, `staging`, `stg`, `preview`, `sandbox` or `local`.

## Release rule
This binder never applies migrations or mutates staging by itself. It only proves that operator-provided environment inputs are safe enough for manual seed rehearsal.
