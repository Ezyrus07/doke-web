# Doke private beta evidence resolution cycle for Windows/VS Code.
# Run from the repository root after tools/private-beta-evidence.windows.ps1 and tools/private-beta-evidence-review.windows.ps1.

$ErrorActionPreference = "Stop"

Write-Host "Doke private beta resolution cycle" -ForegroundColor Cyan
Write-Host "This script does not set secrets and does not release beta users by itself." -ForegroundColor Yellow

npm run execute:private-beta-workstation-report-ingest:report
npm run execute:visual-resolution-backlog:report
npm run execute:quality-resolution-backlog:report
npm run execute:staging-resolution-backlog:report
npm run execute:private-beta-entry-resolution-cycle:report

Write-Host "Resolution reports generated under reports/generated/. Review blockers before setting GO confirmations." -ForegroundColor Cyan
