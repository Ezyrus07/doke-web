@echo off
setlocal
cd /d "%~dp0\..\.."

if exist "tools\local-backups\stage65j\assets\css\pages\home\mobile\base.css.bak" (
  copy /Y "tools\local-backups\stage65j\assets\css\pages\home\mobile\base.css.bak" "assets\css\pages\home\mobile\base.css" >nul
  echo Restored assets\css\pages\home\mobile\base.css
) else (
  echo Missing backup for assets\css\pages\home\mobile\base.css
  exit /b 1
)

echo Stage 65J rollback completed.
