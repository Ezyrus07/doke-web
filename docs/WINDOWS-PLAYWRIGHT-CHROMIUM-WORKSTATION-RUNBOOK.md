# Windows Playwright Chromium Workstation Runbook

## Objective
Prepare Gabriel's Windows/VS Code workstation to run real Doke visual evidence with Playwright-managed Chromium, avoiding system Chrome/Chromium policies that may block localhost.

## Root cause
The container diagnosed a usable Playwright CLI and a system Chromium binary, but system Chromium was blocked by managed URL policy. The correct next path is to install/use Playwright-managed Chromium on the local workstation.

## Safe commands
PowerShell:

```powershell
$env:DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL="1"
npm run resolve:playwright-browser-policy:report

$env:DOKE_VISUAL_RESPONSIVE_EVIDENCE_EXECUTE="1"
$env:DOKE_VISUAL_EVIDENCE_CAPTURE_ONLY="1"
npm run execute:playwright-visual-responsive-evidence:report
npm run execute:visual-evidence-review-package:report
```

## Guardrails
- Do not set production URLs.
- Do not commit `.env` files with local paths or secrets.
- Prefer Playwright-managed Chromium over system Chrome when enterprise policies block localhost.
- Capture-only evidence does not update baselines.

## GO dependency
This runbook only clears the browser execution layer. The private beta still needs visual review, Lighthouse/accessibility evidence, staging seeds, and manual GO confirmation.
