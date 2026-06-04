@echo off
setlocal
cd /d "%~dp0"
echo [Doke Stage 62G] Removendo contrato legado de detalhe-anuncio...
node scripts\stage62g-remove-detalhe-contract.js
if errorlevel 1 (
  echo.
  echo ERRO na Stage 62G. Envie stage62g-detalhe-contract-log.txt.
  pause
  exit /b 1
)
echo.
echo Concluido. Rode agora:
echo npm.cmd run audit:frontend
echo npm.cmd run audit:important-reduction-plan
echo npm.cmd run audit:duplicate-assets
echo npm.cmd run audit:unused-asset-candidates
echo npm.cmd run audit:docs-report-hygiene
pause
