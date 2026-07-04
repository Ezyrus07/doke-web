# Release Go / No-Go Runbook

## Objective
Provide one final evidence-based decision for private beta release.

## Commands

```bash
npm run audit:release-go-no-go-gate
npm run validate:release-go-no-go:dry-run
npm run validate:release-go-no-go:report
```

## GO confirmation
A GO decision requires all evidence reports to be approved and an explicit operator confirmation:

```bash
DOKE_PRIVATE_BETA_GO_CONFIRM=private-beta-go npm run validate:release-go-no-go:report
```

## Required evidence

- Playwright visual evidence package.
- Browser quality evidence package.
- Staging environment binder.
- Private beta operator rehearsal.
- Release candidate assembly.

## Default decision
The default decision is NO-GO until every required evidence package is present and approved.
