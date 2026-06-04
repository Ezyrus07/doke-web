@echo off
setlocal
set "ROOT=%~dp0..\.."

echo [Stage 63L] Restoring CSS backups...
copy /Y "%ROOT%\tools\local-backups\stage63l\assets\css\components\interactions\mobile-action-contract.css.bak" "%ROOT%\assets\css\components\interactions\mobile-action-contract.css" >nul
copy /Y "%ROOT%\tools\local-backups\stage63l\assets\css\pages\comunidade\mobile-shell.css.bak" "%ROOT%\assets\css\pages\comunidade\mobile-shell.css" >nul
copy /Y "%ROOT%\tools\local-backups\stage63l\assets\css\pages\comunidade\mobile-overflow-guard.css.bak" "%ROOT%\assets\css\pages\comunidade\mobile-overflow-guard.css" >nul
copy /Y "%ROOT%\tools\local-backups\stage63l\assets\css\components\internal\page-header.css.bak" "%ROOT%\assets\css\components\internal\page-header.css" >nul

echo [Stage 63L] Rollback complete.
echo Run audits again:
echo npm.cmd run audit:frontend
echo npm.cmd run audit:important-reduction-plan
echo npm.cmd run audit:duplicate-assets
echo npm.cmd run audit:unused-asset-candidates
echo npm.cmd run audit:docs-report-hygiene
endlocal
