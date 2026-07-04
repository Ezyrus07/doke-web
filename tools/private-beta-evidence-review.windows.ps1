# Doke private beta evidence review helper for Windows/VS Code.
# Run from the project root after the evidence batch generated reports.

$ErrorActionPreference = "Stop"

Write-Host "Doke private beta evidence review" -ForegroundColor Cyan

npm run execute:private-beta-report-interpreter:report
npm run execute:visual-findings-triage:report
npm run execute:quality-findings-triage:report
npm run execute:staging-evidence-review:report
npm run execute:private-beta-evidence-adjudicator:report

Write-Host "Review reports/generated/private-beta-evidence-adjudicator-report.json before any GO confirmation." -ForegroundColor Yellow
