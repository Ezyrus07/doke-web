@echo off
setlocal
cd /d "%~dp0\..\.."

if not exist "tools\local-backups\stage65i\assets\css\pages\home\hero.css.bak" (
  echo Backup not found: tools\local-backups\stage65i\assets\css\pages\home\hero.css.bak
  exit /b 1
)

copy /Y "tools\local-backups\stage65i\assets\css\pages\home\hero.css.bak" "assets\css\pages\home\hero.css" >nul

echo Stage 65I rollback applied.
