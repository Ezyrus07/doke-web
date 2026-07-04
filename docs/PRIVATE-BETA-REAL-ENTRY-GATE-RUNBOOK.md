# Private Beta Real Entry Gate Runbook

## Objective
Make the final private beta entry decision from real evidence only.

## Required evidence
- Windows/Playwright-managed Chromium ready.
- Browser policy resolved.
- Visual responsive evidence captured.
- Visual evidence manually reviewed.
- Lighthouse/accessibility evidence approved.
- Staging seed environment ready or completed.
- Evidence loop passed.
- GO pursuit passed.
- Manual entry confirmation provided.

## Commands

```bash
npm run audit:private-beta-real-entry-gate
npm run execute:private-beta-real-entry-gate:dry-run
npm run execute:private-beta-real-entry-gate:check-env
npm run execute:private-beta-real-entry-gate:report
```

Manual GO requires:

```bash
DOKE_PRIVATE_BETA_REAL_ENTRY_CONFIRM=enter-private-beta npm run execute:private-beta-real-entry-gate:report
```

## Default decision
The default decision is always `NO_GO`. The gate only returns GO when every real evidence report passes and the manual confirmation is present.
