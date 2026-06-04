@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo [Doke Stage 59D] Removendo apenas unused candidates de medio risco controlado: comunidade/notificacoes...
echo.

set "deleted=0"
set "missing=0"

for %%F in (
  "assets\css\pages\comunidade\image-cover-redesign.css"
  "assets\css\pages\comunidade\mobile-interaction-contract.css"
  "assets\css\pages\comunidade\mobile-rescue.css"
  "assets\css\pages\notificacoes\mobile-interaction-contract.css"
) do (
  if exist "%%~F" (
    echo Deletando: %%~F
    del /f /q "%%~F"
    if exist "%%~F" (
      echo FALHOU: %%~F
    ) else (
      set /a deleted+=1
    )
  ) else (
    echo Ja ausente: %%~F
    set /a missing+=1
  )
)

echo.
echo Resumo: !deleted! deletado(s) / !missing! ja ausente(s).
echo.
echo Rode em seguida:
echo npm.cmd run audit:unused-asset-candidates
echo npm.cmd run audit:frontend
echo npm.cmd run audit:duplicate-assets
echo npm.cmd run audit:important-reduction-plan
echo npm.cmd run audit:docs-report-hygiene
echo.
pause
endlocal
