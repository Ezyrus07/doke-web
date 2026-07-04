# Private Beta Entry Decision Gate Runbook

## Objective
Adjudicate the private beta entry from visual, quality, staging, resolution, and evidence reports.

## Required accepted statuses
- `visual_correction_matrix_clear`
- `quality_correction_matrix_clear`
- `staging_external_secrets_checklist_ready`
- `private_beta_entry_resolution_cycle_go`
- `private_beta_evidence_adjudicator_go`

## Command

```bash
npm run execute:private-beta-entry-decision-gate:report
```

## GO confirmation

```bash
DOKE_PRIVATE_BETA_ENTRY_DECISION_CONFIRM=enter-private-beta
```

Without this confirmation, the gate remains `NO_GO` even if evidence reports pass.
