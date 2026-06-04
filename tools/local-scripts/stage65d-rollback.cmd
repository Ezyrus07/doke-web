@echo off
setlocal
cd /d "%~dp0\..\.."

copy /Y "tools\local-backups\stage65d\assets\css\pages\home.css.bak" "assets\css\pages\home.css" >nul || exit /b 1
copy /Y "tools\local-backups\stage65d\assets\css\pages\home-runtime.css.bak" "assets\css\pages\home-runtime.css" >nul || exit /b 1
copy /Y "tools\local-backups\stage65d\assets\css\pages\home\publications-no-arrows.css.bak" "assets\css\pages\home\publications-no-arrows.css" >nul || exit /b 1

echo Stage 65D rollback applied.
endlocal
