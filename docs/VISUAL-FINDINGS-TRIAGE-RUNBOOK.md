# Visual Findings Triage Runbook

## Purpose

Turn visual evidence reports into a concrete triage queue. This is the bridge between screenshots and code work: it tells the project which pages/viewports still need screenshots, layout JSON, or manual approval.

This runbook does not alter any visual files.

## Commands

```bash
npm run audit:visual-findings-triage
npm run execute:visual-findings-triage:dry-run
npm run execute:visual-findings-triage:check-env
npm run execute:visual-findings-triage:report
```

## Approval

Approve only after screenshots were reviewed and either accepted or converted into explicit follow-up work:

```bash
DOKE_VISUAL_FINDINGS_ACCEPTED=1 \
DOKE_VISUAL_FINDINGS_REVIEWER="Gabriel" \
npm run execute:visual-findings-triage:report
```

## Expected blocked state

```txt
visual_findings_triage_has_blockers
```

## Accepted state

```txt
visual_findings_triage_ready_for_private_beta_entry
```
