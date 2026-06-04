@echo off
setlocal EnableExtensions DisableDelayedExpansion

REM Stage 58 safe delete - CMD only, no PowerShell.
REM Put this file, DELETE_SAFE_STAGE58.txt, and RODAR_STAGE58_CMD_ONLY.bat in the project root.

set "PROJECT_ROOT=%CD%"
set "LIST_FILE=%PROJECT_ROOT%\DELETE_SAFE_STAGE58.txt"
set "LOG_FILE=%PROJECT_ROOT%\stage58-delete-log.txt"

if not exist "%PROJECT_ROOT%\index.html" (
  echo [ERRO] Nao encontrei index.html nesta pasta.
  echo Abra o terminal na raiz do projeto Doke, onde fica o index.html.
  pause
  exit /b 1
)

if not exist "%LIST_FILE%" (
  echo [ERRO] Nao encontrei DELETE_SAFE_STAGE58.txt nesta pasta.
  pause
  exit /b 1
)

echo Stage 58 Safe Delete - %DATE% %TIME% > "%LOG_FILE%"
echo Projeto: %PROJECT_ROOT% >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

echo.
echo ============================================================
echo  DOKE - STAGE 58 SAFE DELETE
echo ============================================================
echo Esta rotina usa SOMENTE a lista segura DELETE_SAFE_STAGE58.txt.
echo Ela remove docs/reports/test-results/duplicados/remanescentes.
echo.
echo Pasta atual:
echo %PROJECT_ROOT%
echo.
choice /C SN /M "Confirmar delecao segura agora?"
if errorlevel 2 (
  echo Cancelado pelo usuario.
  exit /b 0
)

echo.
echo Deletando arquivos...
echo.

for /F "usebackq delims=" %%P in ("%LIST_FILE%") do call :DeleteOne "%%P"

call :RemoveEmptyDirs "%PROJECT_ROOT%\docs"
call :RemoveEmptyDirs "%PROJECT_ROOT%\reports"
call :RemoveEmptyDirs "%PROJECT_ROOT%\test-results"

echo.
echo ============================================================
echo  Concluido.
echo ============================================================
echo Log criado em: stage58-delete-log.txt
echo Agora rode os audits do projeto.
echo.
pause
exit /b 0

:DeleteOne
set "REL=%~1"
if "%REL%"=="" exit /b 0
set "TARGET=%PROJECT_ROOT%\%REL:/=\%"

if not exist "%TARGET%" (
  echo IGNORADO, nao existe: %REL%
  echo IGNORADO, nao existe: %REL% >> "%LOG_FILE%"
  exit /b 0
)

if exist "%TARGET%\NUL" (
  rmdir /S /Q "%TARGET%" >nul 2>nul
) else (
  del /F /Q "%TARGET%" >nul 2>nul
)

if exist "%TARGET%" (
  echo FALHOU: %REL%
  echo FALHOU: %REL% >> "%LOG_FILE%"
) else (
  echo DELETADO: %REL%
  echo DELETADO: %REL% >> "%LOG_FILE%"
)
exit /b 0

:RemoveEmptyDirs
set "ROOTDIR=%~1"
if not exist "%ROOTDIR%" exit /b 0
for /F "delims=" %%D in ('dir /AD /B /S "%ROOTDIR%" 2^>nul ^| sort /R') do rd "%%D" 2>nul
rd "%ROOTDIR%" 2>nul
exit /b 0
