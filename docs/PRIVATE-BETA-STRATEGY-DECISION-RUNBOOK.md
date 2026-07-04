# Private Beta Strategy Decision Runbook

Purpose: force a deliberate choice between `mock-first` and `real-backend-first`.

## Commands

```bash
npm run audit:private-beta-strategy-decision
npm run execute:private-beta-strategy-decision:dry-run
npm run execute:private-beta-strategy-decision:check-env
npm run execute:private-beta-strategy-decision:report
```

## Strategy env

```bash
DOKE_PRIVATE_BETA_STRATEGY=mock-first
# or
DOKE_PRIVATE_BETA_STRATEGY=real-backend-first
```

Choosing `mock-first` requires explicit communication that data is not real backend persistence. Choosing `real-backend-first` requires staging/Supabase evidence before user entry.
