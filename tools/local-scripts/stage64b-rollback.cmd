@echo off
setlocal
set "ROOT=%~dp0..\.."
copy /Y "%ROOT%\tools\local-backups\stage64b\detalhe-anuncio.html.bak" "%ROOT%\detalhe-anuncio.html" >nul
if errorlevel 1 (
  echo [Stage 64B] Rollback falhou.
  exit /b 1
)
echo [Stage 64B] Rollback aplicado: detalhe-anuncio.html restaurado.
endlocal
