# Playwright Browser Policy Resolution Runbook

## Objective

Resolve the private-beta visual evidence blocker without using a policy-managed system Chromium when that browser blocks localhost or local files.

## Root cause

The visual manifest is now covered, and the Playwright CLI is available. The remaining blocker is browser execution. In this environment the system Chromium exists, but a managed policy can block localhost smoke tests. A Playwright-managed Chromium is preferred because it is not governed by the same system policy path.

## Commands

```bash
npm run audit:playwright-browser-policy-resolution
npm run resolve:playwright-browser-policy:dry-run
npm run resolve:playwright-browser-policy:check-env
npm run resolve:playwright-browser-policy:report
```

To attempt managed Chromium installation, use an explicit flag:

```bash
DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL=1 npm run resolve:playwright-browser-policy:report
```

## Safe statuses

- `playwright_browser_policy_resolved`: usable browser passed localhost smoke.
- `blocked_until_playwright_managed_chromium_install`: no usable browser, and install was not explicitly allowed.
- `playwright_browser_policy_resolution_has_blockers`: install or smoke still failed.

## Guardrails

- No production URL is used.
- No credential is required.
- No visual baseline is changed.
- Browser installation is never attempted unless `DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL=1` is set.
