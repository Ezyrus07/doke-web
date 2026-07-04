# Playwright Visual Evidence Package Runbook

## Objective
Create executable visual evidence for the private beta release candidate without claiming screenshots or browser coverage that were not actually produced.

## Scope
This package is evidence-only. It does not change HTML, CSS, tokens, layout, header, sidebar, routing, mocks or runtime flags.

## Commands

```bash
npm run audit:playwright-visual-evidence-package
npm run validate:playwright-visual-evidence:dry-run
npm run validate:playwright-visual-evidence:check-env
npm run validate:playwright-visual-evidence:report
```

Real browser execution is intentionally gated:

```bash
DOKE_PLAYWRIGHT_VISUAL_EXECUTE=1 npm run validate:playwright-visual-evidence:report
```

## Required viewport evidence

- 390x844
- 608x926
- 810x1080
- 1024x768
- 1280x800

If the current manifest does not cover all viewports, the report must remain blocked until those captures exist.

## Release rule
A private beta RC cannot be marked GO by this package unless the Playwright run passes and required viewport evidence is present.
