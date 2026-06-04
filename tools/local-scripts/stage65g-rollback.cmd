@echo off
setlocal

copy /Y "tools\local-backups\stage65g\assets\css\pages\home-refresh\bridges.css.bak" "assets\css\pages\home-refresh\bridges.css" >nul
if errorlevel 1 (
  echo Failed to restore assets\css\pages\home-refresh\bridges.css
  exit /b 1
)

echo Stage 65G rollback completed.
endlocal
