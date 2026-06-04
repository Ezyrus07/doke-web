@echo off
setlocal
cd /d "%~dp0"
echo Rodando DOKE_STAGE58_DELETE_SAFE_NOW.ps1 na pasta:
echo %CD%
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0DOKE_STAGE58_DELETE_SAFE_NOW.ps1"
echo.
pause
