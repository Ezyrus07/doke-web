# Private Beta GO Pursuit Runbook

Purpose: make one consolidated GO attempt from real evidence, while preserving NO-GO when any required evidence is missing.

Commands:

```bash
npm run audit:private-beta-go-pursuit
npm run execute:private-beta-go-pursuit:dry-run
npm run execute:private-beta-go-pursuit:check-env
npm run execute:private-beta-go-pursuit:report
```

For a browser capture attempt using capture-only evidence:

```bash
DOKE_VISUAL_RESPONSIVE_EVIDENCE_EXECUTE=1 \
DOKE_VISUAL_EVIDENCE_CAPTURE_ONLY=1 \
npm run execute:private-beta-go-pursuit:report
```

GO requires all evidence reports to pass and the private beta go-live confirmation gate to approve. Without staging, Lighthouse/manual accessibility, and explicit release confirmation, the expected result is `NO_GO`.
