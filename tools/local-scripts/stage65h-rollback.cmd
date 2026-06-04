@echo off
setlocal
set "ROOT=%~dp0..\.."
copy /Y "%ROOT%\tools\local-backups\stage65h\assets\css\pages\home-refresh\responsive.css.bak" "%ROOT%\assets\css\pages\home-refresh\responsive.css" >nul
if errorlevel 1 (
  echo [stage65h] Rollback failed.
  exit /b 1
)
echo [stage65h] Rollback applied: assets\css\pages\home-refresh\responsive.css restored.
endlocal
