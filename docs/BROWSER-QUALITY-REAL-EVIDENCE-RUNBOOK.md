# Browser Quality Real Evidence Runbook

## Purpose

Sprint 154-156 binds accessibility, performance and SEO evidence to an executable gate.
It separates static readiness from real browser metrics so the release process cannot claim Lighthouse/Core Web Vitals without a browser target.

## Commands

```bash
npm run audit:browser-quality-real-evidence
npm run execute:browser-quality-real-evidence:dry-run
npm run execute:browser-quality-real-evidence:check-env
npm run execute:browser-quality-real-evidence
npm run execute:browser-quality-real-evidence:report
```

## Real evidence flags

```bash
DOKE_BROWSER_QUALITY_EXECUTE=1 \
DOKE_LIGHTHOUSE_EXECUTE=1 \
DOKE_MANUAL_A11Y_REVIEW_COMPLETE=1 \
npm run execute:browser-quality-real-evidence:report
```

## Expected statuses

- `browser_quality_real_evidence_has_blockers` means at least one real browser quality signal is missing.
- `browser_quality_real_evidence_ready_for_go_no_go` means browser quality evidence can feed the final private beta decision.

## Required evidence

- Accessibility static evidence and manual review.
- Performance budget report and real browser metrics.
- SEO readiness report and public route review.
- Visual/responsive evidence when the browser flag is enabled.
