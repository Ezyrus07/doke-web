@echo off
setlocal

echo [Doke Stage 62B] Remocao agressiva controlada de remanescentes de pagina...
node scripts\stage62b-delete-page-remnants.js

echo.
echo Agora rode:
echo npm.cmd run audit:frontend
echo npm.cmd run audit:important-reduction-plan
echo npm.cmd run audit:duplicate-assets
echo npm.cmd run audit:unused-asset-candidates
echo npm.cmd run audit:docs-report-hygiene
echo.
pause
endlocal
