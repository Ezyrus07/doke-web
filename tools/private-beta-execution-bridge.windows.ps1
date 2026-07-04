# Doke Private Beta Execution Bridge
# Run from the project root in Windows PowerShell / VS Code terminal.
# This script does not print secrets and does not release users automatically.

$ErrorActionPreference = "Stop"

function Step($name) {
  Write-Host ""
  Write-Host "=== $name ===" -ForegroundColor Cyan
}

Step "1. Install dependencies"
npm install

Step "2. Prepare Playwright managed Chromium"
$env:DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL = "1"
npm run resolve:playwright-browser-policy:report

Step "3. Generate visual evidence"
$env:DOKE_VISUAL_RESPONSIVE_EVIDENCE_EXECUTE = "1"
$env:DOKE_VISUAL_EVIDENCE_CAPTURE_ONLY = "1"
npm run execute:playwright-visual-responsive-evidence:report
npm run execute:visual-screenshot-package:report
npm run execute:visual-correction-matrix:report

Step "4. Generate browser quality evidence"
$env:DOKE_BROWSER_QUALITY_EXECUTE = "1"
$env:DOKE_LIGHTHOUSE_EXECUTE = "1"
npm run execute:lighthouse-a11y-workstation:report
npm run execute:quality-correction-matrix:report

Step "5. Review staging env and seeds"
npm run execute:staging-external-secrets-checklist:report
npm run execute:staging-real-env-application:report

Step "6. Produce operator dashboard and short task list"
npm run execute:private-beta-operating-dashboard:report
npm run execute:private-beta-short-task-list:report
npm run execute:human-release-candidate-package:report

Step "7. Choose strategy and run decision"
npm run execute:mock-beta-option-package:report
npm run execute:private-beta-strategy-decision:report
npm run execute:private-beta-entry-decision-gate:report

Write-Host ""
Write-Host "Done. Read reports/generated/private-beta-operating-dashboard.md and reports/generated/private-beta-short-task-list.md" -ForegroundColor Green
