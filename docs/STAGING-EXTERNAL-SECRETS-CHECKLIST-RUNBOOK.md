# Staging External Secrets Checklist Runbook

## Objective
Verify that staging variables required for seed binding exist without printing or committing real secrets.

## Required variables

```bash
DOKE_ENVIRONMENT=staging
DOKE_STAGING_API_URL=...
DOKE_SUPABASE_DB_URL=...
DOKE_STAGING_SEED_BINDER_CONFIRM=bind-staging-seeds
DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE=1
```

## Optional ownership variables

```bash
DOKE_STAGING_SECRETS_OWNER=...
DOKE_STAGING_APPROVED_BY=...
DOKE_STAGING_PROJECT_REF=...
```

## Command

```bash
npm run execute:staging-external-secrets-checklist:report
```

## Safety
The script masks secret previews and rejects production-like values.
