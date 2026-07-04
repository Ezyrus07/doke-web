# Private Beta Execution Bridge Runbook

Purpose: stop adding abstract preparation layers and move the Doke private beta into workstation/staging execution.

## Commands

```bash
npm run audit:private-beta-execution-bridge
npm run execute:private-beta-execution-bridge:dry-run
npm run execute:private-beta-execution-bridge:check-env
npm run execute:private-beta-execution-bridge:report
```

## Windows operator command

```powershell
powershell -ExecutionPolicy Bypass -File tools/private-beta-execution-bridge.windows.ps1
```

## Exit rule

After this bridge exists, do not add new gate-only sprints before running the workstation/staging evidence. The next useful work is evidence execution, visual/quality correction, Supabase binding, or a strategy decision.
