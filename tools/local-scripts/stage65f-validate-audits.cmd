@echo off
setlocal
set "ROOT=%~dp0..\.."
cd /d "%ROOT%" || exit /b 1
npm.cmd run audit:frontend || exit /b 1
npm.cmd run audit:important-reduction-plan || exit /b 1
npm.cmd run audit:agent-governance || exit /b 1
npm.cmd run audit:duplicate-assets || exit /b 1
npm.cmd run audit:unused-asset-candidates || exit /b 1
npm.cmd run audit:docs-report-hygiene || exit /b 1
echo Stage 65F validation completed.
endlocal
