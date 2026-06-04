@echo off
setlocal
cd /d "%~dp0\..\.."

copy /Y "tools\local-backups\stage65l\assets\css\pages\home\mobile\featured.css.bak" "assets\css\pages\home\mobile\featured.css" >nul || exit /b 1

echo Stage 65L rollback applied.
endlocal
