@echo off
setlocal
npm.cmd run audit:frontend || exit /b 1
npm.cmd run audit:important-reduction-plan || exit /b 1
npm.cmd run audit:duplicate-assets || exit /b 1
npm.cmd run audit:unused-asset-candidates || exit /b 1
npm.cmd run audit:docs-report-hygiene || exit /b 1
echo [Stage 64B] Audits finalizados.
endlocal
