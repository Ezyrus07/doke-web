# Lighthouse and Accessibility Workstation Runbook

## Objective

Run or verify real Lighthouse/Core Web Vitals evidence and manual accessibility review from a workstation browser context.

## Commands

```bash
npm run audit:lighthouse-a11y-workstation
npm run execute:lighthouse-a11y-workstation:dry-run
npm run execute:lighthouse-a11y-workstation:check-env
npm run execute:lighthouse-a11y-workstation:report
```

## Execution variables

```bash
DOKE_LIGHTHOUSE_EXECUTE=1
DOKE_LIGHTHOUSE_TARGET_URL=http://127.0.0.1:4173/index.html
DOKE_LIGHTHOUSE_JSON_PATH=reports/generated/lighthouse-report.json
DOKE_MANUAL_A11Y_REVIEW_COMPLETE=1
DOKE_A11Y_REVIEWER=Gabriel
```

## Thresholds

```txt
performance >= 70
accessibility >= 90
best-practices >= 90
seo >= 90
```

## GO status

```txt
lighthouse_a11y_workstation_ready_for_private_beta_entry
```
