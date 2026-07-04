# Staging Seed Binder Runbook

## Purpose

Sprint 157-159 prepares binding to a real Supabase/API staging environment and seed checklist without running mutations by default.
The binder blocks production-looking targets and requires explicit local/staging markers.

## Commands

```bash
npm run audit:staging-seed-binder
npm run bind:staging-seeds:dry-run
npm run bind:staging-seeds:check-env
npm run bind:staging-seeds
npm run bind:staging-seeds:report
```

## Required environment

```bash
DOKE_ENVIRONMENT=staging
DOKE_STAGING_API_URL=https://staging-api.example
DOKE_SUPABASE_DB_URL=postgres://staging...
DOKE_STAGING_SEED_BINDER_CONFIRM=bind-staging-seeds
```

## Mutation flags

Real execution additionally requires:

```bash
DOKE_STAGING_SEED_BINDER_EXECUTE=1
DOKE_SUPABASE_SQL_TESTS_ALLOW_MUTATIONS=1
```

## Required SQL assets

- migrations `001` through `006`
- seeds `001` and `002`
- SQL tests `001` through `005`

## Expected statuses

- `blocked_until_staging_seed_binder_environment` means the environment is not safe/complete.
- `staging_seed_binder_ready_for_manual_execution` means all environment inputs are safe but real mutation flag is absent.
- `staging_seed_binder_bound_for_private_beta_rehearsal` means the staging seed binder gate can feed operator rehearsal.
