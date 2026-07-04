# Doke private beta one-command evidence runner.
# Execute from the project root in PowerShell.
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Run-Phase {
  param(
    [string]$Name,
    [string]$Command
  )
  Write-Host ""
  Write-Host "==== $Name ===="
  Write-Host $Command
  Invoke-Expression $Command
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Phase failed: $Name" -ForegroundColor Yellow
    exit $LASTEXITCODE
  }
}

if (-not (Test-Path "package.json")) {
  Write-Host "Run this script from the Doke project root." -ForegroundColor Red
  exit 1
}

New-Item -ItemType Directory -Force -Path "reports/generated" | Out-Null

Run-Phase "Install dependencies" "npm install"
$env:DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL="1"
Run-Phase "Prepare Playwright-managed Chromium" "npm run resolve:playwright-browser-policy:report"

$env:DOKE_VISUAL_RESPONSIVE_EVIDENCE_EXECUTE="1"
$env:DOKE_VISUAL_EVIDENCE_CAPTURE_ONLY="1"
Run-Phase "Generate visual screenshots" "npm run execute:playwright-visual-responsive-evidence:report"
Run-Phase "Build visual screenshot package" "npm run execute:visual-screenshot-package:report"
Run-Phase "Build visual correction matrix" "npm run execute:visual-correction-matrix:report"

Write-Host ""
Write-Host "Manual checkpoint: review visual screenshots before setting approval env vars." -ForegroundColor Cyan
Write-Host '$env:DOKE_VISUAL_REVIEW_APPROVED="1"'
Write-Host '$env:DOKE_VISUAL_REVIEWER="Gabriel"'

Run-Phase "Run Lighthouse/a11y workstation evidence" "npm run execute:lighthouse-a11y-workstation:report"
Run-Phase "Build quality correction matrix" "npm run execute:quality-correction-matrix:report"

Write-Host ""
Write-Host "Manual checkpoint: fill staging env vars only with external secrets, never commit them." -ForegroundColor Cyan
Run-Phase "Review staging external secrets checklist" "npm run execute:staging-external-secrets-checklist:report"
Run-Phase "Apply staging env report" "npm run execute:staging-real-env-application:report"

Run-Phase "Private beta report interpreter" "npm run execute:private-beta-report-interpreter:report"
Run-Phase "Private beta entry decision gate" "npm run execute:private-beta-entry-decision-gate:report"

Write-Host ""
Write-Host "Evidence run completed. Check reports/generated/private-beta-entry-decision-gate-report.json" -ForegroundColor Green
