@echo off
setlocal
cd /d "%~dp0\..\.."

npm.cmd run audit:frontend || exit /b 1
npm.cmd run audit:important-reduction-plan || exit /b 1
npm.cmd run audit:agent-governance || exit /b 1
npm.cmd run audit:duplicate-assets || exit /b 1
npm.cmd run audit:unused-asset-candidates || exit /b 1
npm.cmd run audit:docs-report-hygiene || exit /b 1

echo Stage 65J audits completed successfully.
