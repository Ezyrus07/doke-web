$ErrorActionPreference = "Stop"
Set-Location "C:\Users\biela\OneDrive\Documentos\dokee-web"
npm install
$env:DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL="1"
npm run prepare:windows-playwright-chromium:report
npm run resolve:playwright-browser-policy:report
$env:DOKE_VISUAL_RESPONSIVE_EVIDENCE_EXECUTE="1"
$env:DOKE_VISUAL_EVIDENCE_CAPTURE_ONLY="1"
npm run execute:playwright-visual-responsive-evidence:report
npm run execute:visual-screenshot-package:report
$env:DOKE_LIGHTHOUSE_EXECUTE="1"
npm run execute:lighthouse-a11y-workstation:report
$env:DOKE_MANUAL_A11Y_REVIEW_COMPLETE="1"
$env:DOKE_A11Y_REVIEWER="Gabriel"
$env:DOKE_VISUAL_REVIEW_APPROVED="1"
$env:DOKE_VISUAL_REVIEWER="Gabriel"
npm run execute:visual-screenshot-package:report
npm run execute:lighthouse-a11y-workstation:report
# Fill staging variables only after a real staging API and Supabase DB exist.
# $env:DOKE_ENVIRONMENT="staging"
# $env:DOKE_STAGING_API_URL="https://staging-api.example"
# $env:DOKE_SUPABASE_DB_URL="postgres://..."
# $env:DOKE_STAGING_SEED_BINDER_CONFIRM="bind-staging-seeds"
# $env:DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE="1"
npm run execute:staging-real-env-application:report
# Only set this after visual, Lighthouse/a11y and staging/seeds reports are approved.
# $env:DOKE_PRIVATE_BETA_REAL_ENTRY_CONFIRM="enter-private-beta"
npm run execute:private-beta-real-entry-repeat:report
