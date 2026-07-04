# Visual Resolution Backlog Runbook

## Scope
Sprint 259-261 translates visual evidence reports into a prioritized backlog. It does not edit HTML or CSS. Actual visual correction should only happen after real screenshots identify concrete defects.

## Commands

```bash
npm run audit:visual-resolution-backlog
npm run execute:visual-resolution-backlog:dry-run
npm run execute:visual-resolution-backlog:check-env
npm run execute:visual-resolution-backlog:report
```

## Required evidence

```bash
npm run execute:visual-screenshot-package:report
npm run execute:visual-findings-triage:report
```

Manual approval must only be set after reviewing screenshots:

```powershell
$env:DOKE_VISUAL_REVIEW_APPROVED="1"
$env:DOKE_VISUAL_REVIEWER="Gabriel"
```

## Output

```txt
reports/generated/visual-resolution-backlog-report.json
```

Accepted status:

```txt
visual_resolution_backlog_clear
```
