# Doke private beta simplified local flow
# Run from the project root in Windows PowerShell.
# This script does not store secrets and does not approve beta automatically.

$ErrorActionPreference = "Continue"

function Step($Title) {
  Write-Host ""
  Write-Host "=== $Title ===" -ForegroundColor Cyan
}

Step "Install dependencies"
npm install

Step "Resolve Playwright Chromium"
$env:DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL="1"
npm run resolve:playwright-browser-policy:report

Step "Capture visual evidence"
$env:DOKE_VISUAL_RESPONSIVE_EVIDENCE_EXECUTE="1"
$env:DOKE_VISUAL_EVIDENCE_CAPTURE_ONLY="1"
npm run execute:playwright-visual-responsive-evidence:report

Step "Build visual review matrix"
npm run execute:visual-correction-matrix:report
npm run execute:visual-manual-priority-checklist:report

Step "Run Lighthouse/accessibility evidence"
npm run execute:lighthouse-a11y-workstation:report
npm run execute:quality-correction-matrix:report

Step "Check staging/env without printing secrets"
npm run execute:staging-external-secrets-checklist:report
npm run execute:staging-security-manual-checklist:report

Step "Generate one-screen summary and human RC package"
npm run execute:private-beta-one-screen-summary:report
npm run execute:human-release-candidate-package:report

Write-Host ""
Write-Host "Open these files next:" -ForegroundColor Green
Write-Host "reports/generated/private-beta-one-screen-summary.md"
Write-Host "reports/generated/human-release-candidate-package.md"
