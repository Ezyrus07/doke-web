# Private Beta Operator Rehearsal Runbook

## Objective
Rehearse the private beta operating sequence before inviting real users.

## Commands

```bash
npm run audit:private-beta-operator-rehearsal
npm run validate:private-beta-operator-rehearsal:dry-run
npm run validate:private-beta-operator-rehearsal:report
```

## Sequence

1. Confirm local evidence package.
2. Confirm staging preparation package.
3. Confirm staging environment binder status.
4. Confirm cohort/user-entry plan.
5. Confirm private beta release checklist.
6. Confirm rollback owner, support owner and incident channel.

## Non-go rule
The rehearsal does not invite users, does not mutate production and does not override missing real staging or visual evidence.
