# Lighthouse + Accessibility Evidence Package Runbook

## Objective
Collect or validate browser quality evidence for private beta: Lighthouse/Core Web Vitals and manual accessibility review.

## Commands

```bash
npm run audit:lighthouse-a11y-evidence-package
npm run execute:lighthouse-a11y-evidence:dry-run
npm run execute:lighthouse-a11y-evidence:check-env
npm run execute:lighthouse-a11y-evidence:report
```

Real collection example:

```bash
DOKE_LIGHTHOUSE_TARGET_URL="http://127.0.0.1:4173/" \
DOKE_LIGHTHOUSE_EXECUTE=1 \
npm run execute:lighthouse-a11y-evidence:report
```

Manual accessibility evidence must be saved as JSON, for example:

```json
{
  "status": "approved",
  "reviewer": "Gabriel",
  "checkedAt": "2026-07-04T00:00:00.000Z",
  "notes": ["Keyboard navigation and visible focus reviewed on priority pages."]
}
```

Default path:

```txt
reports/generated/manual-a11y-review-report.json
```

## Thresholds
- Performance: 70+
- Accessibility: 90+
- Best practices: 90+
- SEO: 90+

## Guardrails
Production-like URLs are blocked. Use localhost, staging, stg, preview, sandbox, or local markers.
