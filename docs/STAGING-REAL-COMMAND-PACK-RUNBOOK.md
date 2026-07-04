# Staging Real Command Pack Runbook

## Objective

Prepare copy-safe staging commands for the private beta without committing staging credentials or mutating staging accidentally.

## Commands

```bash
npm run audit:staging-real-command-pack
npm run prepare:staging-real-command-pack:dry-run
npm run prepare:staging-real-command-pack:check-env
npm run prepare:staging-real-command-pack:report
```

## Local setup

Copy the template and fill it locally. Do not commit the filled file.

```bash
cp config/staging-real.env.example .env.staging.local
```

Required variables:

```txt
DOKE_ENVIRONMENT=staging
DOKE_STAGING_API_URL=
DOKE_SUPABASE_DB_URL=
DOKE_STAGING_SEED_BINDER_CONFIRM=bind-staging-seeds
DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE=1
```

## Mutation command

Only run after confirming the staging project is disposable or backed up:

```bash
DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE=1 npm run execute:staging-real-seed-operator:report
```

## Safe statuses

- `staging_real_command_pack_ready_for_seed_operator`: environment is ready.
- `staging_real_command_pack_ready_with_env_blockers`: command pack is ready, but env is missing.
