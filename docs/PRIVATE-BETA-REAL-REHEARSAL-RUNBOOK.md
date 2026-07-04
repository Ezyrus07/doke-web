# Private Beta Real Rehearsal Runbook

## Purpose

Sprint 160-162 rehearses the private beta release operation using the real-evidence reports produced by the previous gates.
It keeps the release in NO-GO unless the visual, quality and staging seed binder reports are accepted.

## Commands

```bash
npm run audit:private-beta-real-rehearsal
npm run validate:private-beta-real-rehearsal:dry-run
npm run validate:private-beta-real-rehearsal
npm run validate:private-beta-real-rehearsal:report
```

## Confirmation

```bash
DOKE_PRIVATE_BETA_REHEARSAL_CONFIRM=rehearse-private-beta npm run validate:private-beta-real-rehearsal:report
```

## Required accepted reports

- `reports/generated/playwright-visual-responsive-execution-report.json`
- `reports/generated/browser-quality-real-evidence-report.json`
- `reports/generated/staging-seed-binder-report.json`

## Expected statuses

- `private_beta_real_rehearsal_has_blockers` means release operations cannot advance.
- `private_beta_real_rehearsal_ready_for_go_no_go` means the rehearsal can feed the private beta GO/NO-GO gate.
