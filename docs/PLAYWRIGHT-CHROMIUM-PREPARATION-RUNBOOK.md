# Playwright Chromium Preparation Runbook

Purpose: identify a usable Chromium runtime for real visual evidence without requiring production or hardcoded credentials.

Commands:

```bash
npm run audit:playwright-chromium-preparation
npm run prepare:playwright-chromium:dry-run
npm run prepare:playwright-chromium:check-env
npm run prepare:playwright-chromium:report
```

Safe fallback order:

1. `DOKE_PLAYWRIGHT_EXECUTABLE_PATH`
2. system Chromium such as `/usr/bin/chromium`
3. Playwright cache binary

Installation requires explicit consent:

```bash
DOKE_PLAYWRIGHT_CHROMIUM_INSTALL=1 npm run prepare:playwright-chromium:report
```
