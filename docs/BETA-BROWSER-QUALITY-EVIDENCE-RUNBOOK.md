# Beta Browser Quality Evidence Runbook

## Objective
Bind accessibility, performance and SEO evidence into an explicit quality package for private beta.

## Commands

```bash
npm run audit:browser-quality-evidence-package
npm run validate:browser-quality-evidence:dry-run
npm run validate:browser-quality-evidence:report
```

## Evidence types

- Static accessibility evidence from HTML inspection.
- Static performance budget evidence from local asset sizes.
- Static SEO readiness evidence from document metadata.
- Real browser evidence, when available: Lighthouse/Core Web Vitals, keyboard/focus review and route crawl.

## Non-go rule
Static evidence is useful but not enough for wider beta. Lighthouse/Core Web Vitals and manual accessibility review remain blockers until executed in a real browser.
