# Quality Correction Matrix Runbook

## Objective
Convert Lighthouse/a11y evidence into a metric matrix with explicit thresholds and remediation tasks.

## Thresholds
- performance >= 70
- accessibility >= 90
- best-practices >= 90
- seo >= 90

## Command

```bash
npm run execute:quality-correction-matrix:report
```

## Manual accessibility gate

```bash
DOKE_MANUAL_A11Y_REVIEW_COMPLETE=1
DOKE_A11Y_REVIEWER=Gabriel
```

## Outputs
- `reports/generated/quality-correction-matrix-report.json`
- `reports/generated/quality-correction-matrix.json`
- `reports/generated/quality-correction-matrix.md`
