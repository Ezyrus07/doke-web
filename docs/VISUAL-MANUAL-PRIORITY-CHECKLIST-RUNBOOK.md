# Visual Manual Priority Checklist Runbook

Status: Sprint 292-294.

Purpose: convert visual screenshot/layout evidence into a prioritized manual checklist by page and viewport.

Commands:

```bash
npm run audit:visual-manual-priority-checklist
npm run execute:visual-manual-priority-checklist:dry-run
npm run execute:visual-manual-priority-checklist:check-env
npm run execute:visual-manual-priority-checklist:report
```

Output:

```txt
reports/generated/visual-manual-priority-checklist.md
reports/generated/visual-manual-priority-checklist.json
reports/generated/visual-manual-priority-checklist-report.json
```

Approval envs:

```bash
DOKE_VISUAL_REVIEW_APPROVED=1
DOKE_VISUAL_REVIEWER=<reviewer-name>
```

Do not set approval envs until screenshots were actually reviewed.
