# Visual + Responsive Evidence Execution Runbook

## Purpose

Sprint 151-153 converts the previous Playwright visual evidence package into an executable operator gate.
It must never fabricate screenshots or responsive evidence. Without an explicit execution flag it reports a blocker.

## Commands

```bash
npm run audit:playwright-visual-responsive-evidence
npm run execute:playwright-visual-responsive-evidence:dry-run
npm run execute:playwright-visual-responsive-evidence:check-env
npm run execute:playwright-visual-responsive-evidence
npm run execute:playwright-visual-responsive-evidence:report
```

## Real execution

```bash
DOKE_VISUAL_RESPONSIVE_EVIDENCE_EXECUTE=1 npm run execute:playwright-visual-responsive-evidence:report
```

The real execution invokes:

- `npm run test:visual`
- `npm run test:responsive-contract`
- `npm run test:header-rail-contract`

## Expected statuses

- `blocked_until_visual_responsive_execution_flag` means no browser evidence was executed.
- `visual_responsive_evidence_ready_for_go_no_go` means the required visual/responsive commands passed and can feed the private beta GO/NO-GO gates. The older `visual_responsive_evidence_ready_for_private_beta_review` status remains accepted only for backwards compatibility.
- `visual_responsive_evidence_execution_has_blockers` means screenshots or responsive contracts must be fixed before private beta.

## Scope

This runbook does not change HTML, CSS, visual surface, routes or production configuration.

## Sprint 166-180 viewport expansion

The visual manifest now covers the private-beta viewport matrix:

- `390x844`
- `608x926`
- `810x1080`
- `820x1180`
- `1024x768`
- `1280x800`
- `1366x768`

This fixes the previous manifest coverage blocker. It does not automatically approve screenshots. Real Playwright evidence still requires browser execution and review.

## Sprint 166-180 Playwright CLI binding

The package scripts now call the local Playwright test CLI directly:

```bash
node node_modules/@playwright/test/cli.js test
```

This avoids relying on a non-executable `node_modules/.bin/playwright` shim or an unrelated global `playwright` command.


## Sprint 181-195 Evidence Pursuit

- Added Playwright Chromium preparation and system-browser fallback.
- Added capture-only visual evidence spec for real screenshot evidence without rewriting approved baselines.
- Added staging real seed operator and private beta GO pursuit orchestrator.
- GO remains blocked unless real visual, browser quality, staging seeds, rehearsal, and manual confirmation pass.
