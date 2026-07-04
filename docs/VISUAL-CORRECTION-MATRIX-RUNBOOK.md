# Visual Correction Matrix Runbook

## Objective
Convert visual evidence into a page × viewport matrix so missing screenshots, missing layout evidence, and pending manual approval become explicit tasks.

## Inputs
- `tests/visual/visual-regression.manifest.json`
- screenshot output from Playwright evidence commands
- optional layout JSON evidence

## Command

```bash
npm run execute:visual-correction-matrix:report
```

## GO condition
The matrix is clear only when every manifest cell has screenshot and layout evidence, plus manual review markers:

```bash
DOKE_VISUAL_REVIEW_APPROVED=1
DOKE_VISUAL_REVIEWER=Gabriel
```

## Outputs
- `reports/generated/visual-correction-matrix-report.json`
- `reports/generated/visual-correction-matrix.json`
- `reports/generated/visual-correction-matrix.md`
