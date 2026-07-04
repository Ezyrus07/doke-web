# Private Beta Entry Resolution Cycle Runbook

## Scope
Sprint 268-270 runs the private beta entry cycle after workstation reports, visual backlog, quality backlog and staging backlog have been generated. This is a controlled GO/NO-GO adjudication layer, not an automatic launch.

## Commands

```bash
npm run audit:private-beta-entry-resolution-cycle
npm run execute:private-beta-entry-resolution-cycle:dry-run
npm run execute:private-beta-entry-resolution-cycle:check-env
npm run execute:private-beta-entry-resolution-cycle:report
```

## Windows helper

```powershell
tools/private-beta-resolution-cycle.windows.ps1
```

## Full adjudication

Only after all reports are real and reviewed:

```powershell
$env:DOKE_PRIVATE_BETA_ENTRY_RESOLUTION_RUN_FULL="1"
$env:DOKE_PRIVATE_BETA_ENTRY_RESOLUTION_CONFIRM="resolve-private-beta-entry"
$env:DOKE_PRIVATE_BETA_ADJUDICATOR_CONFIRM="adjudicate-private-beta-go"
npm run execute:private-beta-entry-resolution-cycle:report
```

## Output

```txt
reports/generated/private-beta-entry-resolution-cycle-report.json
```

GO status:

```txt
private_beta_entry_resolution_cycle_go
```

Default safe status:

```txt
private_beta_entry_resolution_cycle_no_go
```
