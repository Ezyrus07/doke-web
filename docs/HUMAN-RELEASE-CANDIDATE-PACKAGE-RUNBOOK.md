# Human Release Candidate Package Runbook

Status: Sprint 298-300.

Purpose: generate a human-readable RC package answering: what is ready, what blocks private beta, and what must happen next.

Commands:

```bash
npm run audit:human-release-candidate-package
npm run execute:human-release-candidate-package:dry-run
npm run execute:human-release-candidate-package:check-env
npm run execute:human-release-candidate-package:report
```

Output:

```txt
reports/generated/human-release-candidate-package.md
reports/generated/human-release-candidate-package-report.json
```

The package must remain NO-GO when evidence is missing. It is a decision aid, not an automatic release mechanism.
