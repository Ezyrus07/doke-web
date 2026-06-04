@echo off
setlocal
cd /d "%~dp0\..\.."

echo [stage65e] Running frontend governance audits...
call npm.cmd run audit:frontend || exit /b 1
call npm.cmd run audit:important-reduction-plan || exit /b 1
call npm.cmd run audit:agent-governance || exit /b 1
call npm.cmd run audit:duplicate-assets || exit /b 1
call npm.cmd run audit:unused-asset-candidates || exit /b 1
call npm.cmd run audit:docs-report-hygiene || exit /b 1
call git diff --check || exit /b 1

echo [stage65e] Audits passed.
endlocal
