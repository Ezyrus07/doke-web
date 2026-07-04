# Windows Private Beta One Command Runbook

## Objective
Run the private beta evidence chain from Windows/VS Code with short phase logs and no production mutation.

## Command

```powershell
powershell -ExecutionPolicy Bypass -File tools/private-beta-one-command.windows.ps1
```

## Behavior
The script runs dependency install, Playwright-managed Chromium preparation, visual screenshot evidence, screenshot packaging, visual correction matrix, Lighthouse/a11y workstation evidence, quality correction matrix, staging secret checks, staging env application checks, report interpretation, and the private beta entry decision gate.

## Safety
- Real secrets must remain outside the repository.
- Production-like URLs remain blocked by the staging validators.
- GO requires explicit manual confirmation through `DOKE_PRIVATE_BETA_ENTRY_DECISION_CONFIRM=enter-private-beta`.

## Validation

```bash
npm run audit:windows-private-beta-one-command
npm run execute:windows-private-beta-one-command:dry-run
npm run execute:windows-private-beta-one-command:check-env
npm run execute:windows-private-beta-one-command:report
```
