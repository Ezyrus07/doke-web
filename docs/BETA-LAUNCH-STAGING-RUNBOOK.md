# Beta Launch Staging Runbook

## Objective
Prepare guarded staging execution for private beta launch domains.

## Dry run
```bash
npm run execute:beta-launch:staging:dry-run
```

## Environment check
```bash
DOKE_ENVIRONMENT=staging \
DOKE_BETA_LAUNCH_STAGING_API_URL=https://staging-api.example \
DOKE_BETA_LAUNCH_STAGING_ALLOW_NETWORK=1 \
DOKE_BETA_LAUNCH_STAGING_ALLOW_MUTATIONS=1 \
npm run execute:beta-launch:staging:check-env
```

## Manual execution gate
Real execution additionally requires:

```bash
DOKE_BETA_LAUNCH_STAGING_EXECUTE=1
DOKE_BETA_LAUNCH_STAGING_CONFIRM=execute-beta-launch-domains
```

The executor must never be pointed at a production URL. The code blocks targets that do not look like local/staging/sandbox.
