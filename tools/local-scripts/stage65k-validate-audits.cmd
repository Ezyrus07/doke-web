@echo off
setlocal
cd /d "%~dp0..\.."

echo [stage65k] audit:frontend
call npm.cmd run audit:frontend || exit /b 1

echo [stage65k] audit:important-reduction-plan
call npm.cmd run audit:important-reduction-plan || exit /b 1

echo [stage65k] audit:agent-governance
call npm.cmd run audit:agent-governance || exit /b 1

echo [stage65k] audit:duplicate-assets
call npm.cmd run audit:duplicate-assets || exit /b 1

echo [stage65k] audit:unused-asset-candidates
call npm.cmd run audit:unused-asset-candidates || exit /b 1

echo [stage65k] audit:docs-report-hygiene
call npm.cmd run audit:docs-report-hygiene || exit /b 1

echo [stage65k] audits passed
endlocal
