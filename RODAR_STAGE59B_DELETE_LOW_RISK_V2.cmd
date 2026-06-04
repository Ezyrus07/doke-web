@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

echo [Doke Stage 59B] Removendo candidatos unused de BAIXO RISCO - V2...
echo.

set FOUND=0
set MISSING=0
set DELETED=0

call :deleteFile "assets\css\pages\desktop-cleanup.css"
call :deleteFile "assets\css\pages\notificacoes\selection-cleanup.css"
call :deleteFile "assets\css\pages\results\results-density-polish.css"
call :deleteFile "assets\css\pages\results\results-grid-polish.css"
call :deleteFile "assets\css\pages\selection\selection-cleanup.css"
call :deleteFile "assets\js\core\supabase-config.example.js"
call :deleteFile "assets\js\pages\results\results-layout-polish.js"
call :deleteFile "assets\js\pages\selection\selection-cleanup.js"

echo.
echo Resumo: !DELETED! deletados / !MISSING! ja ausentes.
echo.
echo Agora rode:
echo npm.cmd run audit:unused-asset-candidates
echo npm.cmd run audit:frontend
echo npm.cmd run audit:duplicate-assets
echo npm.cmd run audit:important-reduction-plan
echo.
pause
exit /b 0

:deleteFile
set "TARGET=%~1"
if exist "%TARGET%" (
  echo Deletando: %TARGET%
  del /f /q "%TARGET%"
  if exist "%TARGET%" (
    echo FALHOU: %TARGET%
  ) else (
    set /a DELETED+=1
  )
) else (
  echo JA AUSENTE: %TARGET%
  set /a MISSING+=1
)
exit /b 0
