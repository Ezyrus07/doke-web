@echo off
setlocal
cd /d "%~dp0..\.."

echo [stage65k] restoring backups
if exist "tools\local-backups\stage65k\assets\css\pages\home\workers-preview.css.bak" copy /Y "tools\local-backups\stage65k\assets\css\pages\home\workers-preview.css.bak" "assets\css\pages\home\workers-preview.css" >nul
if exist "tools\local-backups\stage65k\assets\css\pages\home\workers-hover-preview.css.bak" copy /Y "tools\local-backups\stage65k\assets\css\pages\home\workers-hover-preview.css.bak" "assets\css\pages\home\workers-hover-preview.css" >nul
if exist "tools\local-backups\stage65k\assets\js\pages\home\workers-hover-preview.js.bak" copy /Y "tools\local-backups\stage65k\assets\js\pages\home\workers-hover-preview.js.bak" "assets\js\pages\home\workers-hover-preview.js" >nul

echo [stage65k] rollback completed
endlocal
