# Private Beta Workstation Report Ingest Runbook

## Scope
Sprint 256-258 introduces a report ingest layer for the Windows/VS Code evidence package. It does not approve private beta entry. It reads generated reports and converts missing or blocked evidence into actionable items.

## Commands

```bash
npm run audit:private-beta-workstation-report-ingest
npm run execute:private-beta-workstation-report-ingest:dry-run
npm run execute:private-beta-workstation-report-ingest:check-env
npm run execute:private-beta-workstation-report-ingest:report
```

## Required prior evidence

Run these on the workstation before expecting a GO result:

```powershell
tools/private-beta-evidence.windows.ps1
tools/private-beta-evidence-review.windows.ps1
```

## Output

The command writes:

```txt
reports/generated/private-beta-workstation-report-ingest-report.json
```

The status remains blocked until visual, quality, staging and entry reports are present and accepted.
