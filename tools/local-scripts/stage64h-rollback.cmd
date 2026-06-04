@echo off
setlocal
cd /d "%~dp0\..\.."

set "BACKUP_DIR=tools\local-backups\stage64h"

copy /Y "%BACKUP_DIR%\assets__css__components__cards__mobile-list-card-system.css.bak" "assets\css\components\cards\mobile-list-card-system.css" >nul
if errorlevel 1 exit /b %errorlevel%

echo Stage 64H rollback restored CSS backup.
endlocal
