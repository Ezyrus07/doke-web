# Staging Security Manual Checklist Runbook

Status: Sprint 295-297.

Purpose: verify staging env, secrets, rollback owner, support owner, incident channel, and security reviewer before private beta entry.

Commands:

```bash
npm run audit:staging-security-manual-checklist
npm run execute:staging-security-manual-checklist:dry-run
npm run execute:staging-security-manual-checklist:check-env
npm run execute:staging-security-manual-checklist:report
```

Output:

```txt
reports/generated/staging-security-manual-checklist.md
reports/generated/staging-security-manual-checklist-report.json
```

Security rules:

- Do not commit real secrets.
- Do not print full secrets in reports.
- Do not use production-looking URLs.
- Always assign rollback/support/security ownership before inviting real users.
