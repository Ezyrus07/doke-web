# Quality Resolution Backlog Runbook

## Scope
Sprint 262-264 converts Lighthouse and accessibility evidence into a prioritized quality backlog. It does not fake Lighthouse, Core Web Vitals or manual accessibility review.

## Commands

```bash
npm run audit:quality-resolution-backlog
npm run execute:quality-resolution-backlog:dry-run
npm run execute:quality-resolution-backlog:check-env
npm run execute:quality-resolution-backlog:report
```

## Required evidence

```bash
npm run execute:lighthouse-a11y-workstation:report
npm run execute:quality-findings-triage:report
```

Manual review confirmation:

```powershell
$env:DOKE_MANUAL_A11Y_REVIEW_COMPLETE="1"
$env:DOKE_A11Y_REVIEWER="Gabriel"
```

## Output

```txt
reports/generated/quality-resolution-backlog-report.json
```

Accepted status:

```txt
quality_resolution_backlog_clear
```
