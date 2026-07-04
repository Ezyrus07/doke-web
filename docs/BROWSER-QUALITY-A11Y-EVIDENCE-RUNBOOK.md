# Browser Quality and Accessibility Evidence Runbook

Purpose: connect visual browser execution with quality evidence while clearly separating automated evidence from manual accessibility review.

Required for GO:

- real browser visual evidence;
- Lighthouse/Core Web Vitals evidence;
- manual keyboard/focus/screen-reader accessibility review;
- quality gate report.

Relevant command:

```bash
DOKE_BROWSER_QUALITY_EXECUTE=1 \
DOKE_LIGHTHOUSE_EXECUTE=1 \
DOKE_MANUAL_A11Y_REVIEW_COMPLETE=1 \
npm run execute:browser-quality-real-evidence:report
```

Do not set manual flags unless the review was actually performed.
