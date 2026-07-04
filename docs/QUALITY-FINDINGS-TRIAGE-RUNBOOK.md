# Quality Findings Triage Runbook

## Purpose

Interpret Lighthouse/Core Web Vitals and manual accessibility reports into a quality action queue.

This runbook does not run Lighthouse itself and does not change code. It reads the reports produced by the workstation quality packages.

## Commands

```bash
npm run audit:quality-findings-triage
npm run execute:quality-findings-triage:dry-run
npm run execute:quality-findings-triage:check-env
npm run execute:quality-findings-triage:report
```

## Thresholds

```txt
performance >= 70
accessibility >= 90
best-practices >= 90
seo >= 90
```

## Approval

Approve only after low scores or accessibility issues are accepted or queued as explicit work:

```bash
DOKE_QUALITY_FINDINGS_ACCEPTED=1 \
DOKE_QUALITY_REVIEWER="Gabriel" \
npm run execute:quality-findings-triage:report
```

## Accepted state

```txt
quality_findings_triage_ready_for_private_beta_entry
```
