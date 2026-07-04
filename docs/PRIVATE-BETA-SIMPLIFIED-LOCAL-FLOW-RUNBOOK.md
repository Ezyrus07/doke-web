# Private Beta Simplified Local Flow Runbook

Status: Sprint 286-288.

Purpose: provide the shortest safe Windows/VS Code execution path for private beta evidence without approving release automatically.

Commands:

```bash
npm run audit:private-beta-simplified-local-flow
npm run execute:private-beta-simplified-local-flow:dry-run
npm run execute:private-beta-simplified-local-flow:check-env
npm run execute:private-beta-simplified-local-flow:report
```

Windows operator command:

```powershell
powershell -ExecutionPolicy Bypass -File tools/private-beta-simplified-flow.windows.ps1
```

Rules:

- No production mutation.
- No secret is written to repository files.
- The result remains NO-GO until visual, quality, staging, and manual approvals are present.
