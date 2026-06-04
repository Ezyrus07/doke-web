@echo off
setlocal
cd /d "%~dp0\..\.."

echo [stage65e] Restoring removed Home footer stylesheet from local backup...
if not exist "tools\local-backups\stage65e\assets\css\pages\home\footer.css.bak" (
  echo [stage65e] Backup not found.
  exit /b 1
)
copy /Y "tools\local-backups\stage65e\assets\css\pages\home\footer.css.bak" "assets\css\pages\home\footer.css" >nul
if errorlevel 1 exit /b 1

echo [stage65e] Rollback complete. Run tools\local-scripts\stage65e-validate-audits.cmd next.
endlocal
