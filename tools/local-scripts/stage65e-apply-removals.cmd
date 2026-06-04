@echo off
setlocal
cd /d "%~dp0\..\.."

echo [stage65e] Removing proven unreferenced Home footer stylesheet...
if exist "assets\css\pages\home\footer.css" (
  del /F /Q "assets\css\pages\home\footer.css"
  if errorlevel 1 exit /b 1
)

echo [stage65e] Removal applied. Run tools\local-scripts\stage65e-validate-audits.cmd next.
endlocal
