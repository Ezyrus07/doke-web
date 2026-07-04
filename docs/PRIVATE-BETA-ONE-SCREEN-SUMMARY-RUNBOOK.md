# Private Beta One-Screen Summary Runbook

Status: Sprint 289-291.

Purpose: render the current beta evidence state into one concise Markdown page for a human operator.

Commands:

```bash
npm run audit:private-beta-one-screen-summary
npm run execute:private-beta-one-screen-summary:dry-run
npm run execute:private-beta-one-screen-summary:check-env
npm run execute:private-beta-one-screen-summary:report
```

Output:

```txt
reports/generated/private-beta-one-screen-summary.md
reports/generated/private-beta-one-screen-summary-report.json
```

The summary may say NO-GO. That is expected until real browser evidence, staging evidence, and manual approvals exist.
