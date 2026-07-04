# Private Beta Go Live Runbook

## Purpose

Sprint 163-165 creates the last GO/NO-GO decision gate for private beta.
It requires real evidence and manual confirmation. It must default to NO-GO.

## Commands

```bash
npm run audit:private-beta-go-live-gate
npm run validate:private-beta-go-live:dry-run
npm run validate:private-beta-go-live
npm run validate:private-beta-go-live:report
```

## Manual confirmation

```bash
DOKE_PRIVATE_BETA_GO_LIVE_CONFIRM=launch-private-beta npm run validate:private-beta-go-live:report
```

## Required reports

- Visual/responsive execution report.
- Browser quality real evidence report.
- Staging seed binder report.
- Private beta real rehearsal report.
- Release go/no-go report.

## Expected statuses

- `private_beta_go_live_blocked_by_evidence` means the beta remains NO-GO.
- `private_beta_go_live_ready_for_manual_user_entry` means the product may start controlled private beta cohorts.

## Rollback

If private beta is stopped, revert canary flags and force mock providers:

```js
Doke.services.betaLaunch?.rollbackBetaLaunchCanary?.();
Doke.services.orders?.rollbackOrdersWriteCanary?.();
localStorage.setItem('doke.dataProvider', 'mock');
```

## Sprint 166-180 real attempt wrapper

Use the real attempt wrapper when preparing an actual GO/NO-GO pass:

```bash
npm run execute:private-beta-real-go-attempt:report
```

This wrapper does not bypass existing gates. It only orchestrates visual evidence, browser quality evidence, staging seed binding, real rehearsal and go-live validation into one report.


## Sprint 181-195 Evidence Pursuit

- Added Playwright Chromium preparation and system-browser fallback.
- Added capture-only visual evidence spec for real screenshot evidence without rewriting approved baselines.
- Added staging real seed operator and private beta GO pursuit orchestrator.
- GO remains blocked unless real visual, browser quality, staging seeds, rehearsal, and manual confirmation pass.
