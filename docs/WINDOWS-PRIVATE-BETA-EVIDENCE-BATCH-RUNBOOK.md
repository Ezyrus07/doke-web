# Windows Private Beta Evidence Batch Runbook

## Objective

Provide one ordered workstation path for the real private beta evidence loop on Windows/VS Code.

This runbook does not enable production and does not store real credentials. It only prepares explicit commands for:

1. Playwright-managed Chromium install.
2. Visual responsive evidence capture.
3. Screenshot review package.
4. Lighthouse/Core Web Vitals and manual accessibility evidence.
5. Staging seed environment validation.
6. Private beta real-entry repeat gate.

## Commands

```bash
npm run audit:windows-private-beta-evidence-batch
npm run execute:windows-private-beta-evidence-batch:dry-run
npm run execute:windows-private-beta-evidence-batch:check-env
npm run execute:windows-private-beta-evidence-batch:report
```

The report command writes:

```txt
reports/generated/windows-private-beta-evidence-batch-report.json
tools/private-beta-evidence.windows.ps1
```

## Windows execution

Review `config/private-beta-workstation.env.example`, then run the generated PowerShell script from the project root in VS Code.

The script intentionally keeps the staging lines commented until a real staging API and Supabase DB exist.

## Safety

- Do not use production URLs.
- Do not commit real credentials.
- Keep visual evidence in capture-only mode until screenshots are reviewed.
- Only set `DOKE_PRIVATE_BETA_REAL_ENTRY_CONFIRM=enter-private-beta` after visual, Lighthouse/a11y, staging and support ownership evidence are approved.
