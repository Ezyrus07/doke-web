@echo off
setlocal
cd /d "%~dp0"

echo [Doke Stage 60G] Remocao controlada: auth login-controller...
echo.

node scripts\stage60g-delete-auth-login-controller.js
set EXITCODE=%ERRORLEVEL%

echo.
echo Agora rode:
echo npm.cmd run audit:unused-asset-candidates
echo npm.cmd run audit:frontend
echo npm.cmd run audit:duplicate-assets
echo npm.cmd run audit:important-reduction-plan
echo npm.cmd run audit:docs-report-hygiene
echo.

if not "%EXITCODE%"=="0" (
  echo A Stage 60G foi bloqueada ou encontrou erro. Veja o relatorio em reports\generated.
) else (
  echo Stage 60G concluida.
)

pause
exit /b %EXITCODE%
