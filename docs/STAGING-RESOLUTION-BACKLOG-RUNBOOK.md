# Staging Resolution Backlog Runbook

## Scope
Sprint 265-267 converts staging environment and seed evidence into a prioritized backlog. It never commits staging URLs, database URLs or secrets.

## Commands

```bash
npm run audit:staging-resolution-backlog
npm run execute:staging-resolution-backlog:dry-run
npm run execute:staging-resolution-backlog:check-env
npm run execute:staging-resolution-backlog:report
```

## Required environment

Set these only in the local shell:

```powershell
$env:DOKE_ENVIRONMENT="staging"
$env:DOKE_STAGING_API_URL="https://staging-api.example"
$env:DOKE_SUPABASE_DB_URL="postgres://..."
$env:DOKE_STAGING_SEED_BINDER_CONFIRM="bind-staging-seeds"
$env:DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE="1"
```

## Required evidence

```bash
npm run execute:staging-real-env-application:report
npm run execute:staging-evidence-review:report
```

## Output

```txt
reports/generated/staging-resolution-backlog-report.json
```

Accepted status:

```txt
staging_resolution_backlog_clear
```
