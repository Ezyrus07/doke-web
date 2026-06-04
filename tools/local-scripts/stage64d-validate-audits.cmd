@echo off
setlocal

echo [stage64d] Running frontend audits...
call npm.cmd run audit:frontend || exit /b 1
call npm.cmd run audit:important-reduction-plan || exit /b 1
call npm.cmd run audit:duplicate-assets || exit /b 1
call npm.cmd run audit:unused-asset-candidates || exit /b 1
call npm.cmd run audit:docs-report-hygiene || exit /b 1

echo [stage64d] Audits completed.
