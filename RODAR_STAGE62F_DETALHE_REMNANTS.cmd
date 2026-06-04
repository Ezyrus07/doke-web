@echo off
setlocal
cd /d "%~dp0"
echo [Doke Stage 62F] Removendo remanescentes controlados do detalhe-anuncio...
echo Log: stage62f-detail-remnants-log.txt
node scripts\stage62f-remove-detail-remnants.js
if errorlevel 1 (
  echo.
  echo ERRO na Stage 62F. Veja stage62f-detail-remnants-log.txt.
) else (
  echo.
  echo Stage 62F concluida.
)
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
