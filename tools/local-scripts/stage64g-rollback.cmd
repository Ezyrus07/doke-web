@echo off
setlocal
cd /d "%~dp0\..\.."

set "BACKUP_DIR=tools\local-backups\stage64g"

copy /Y "%BACKUP_DIR%\assets__css__pages__perfil-reviews-page.css.bak" "assets\css\pages\perfil-reviews-page.css" >nul
if errorlevel 1 exit /b %errorlevel%

echo Stage 64G rollback restored CSS backup.
endlocal
