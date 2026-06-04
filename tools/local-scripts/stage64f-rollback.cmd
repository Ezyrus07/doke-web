@echo off
setlocal
cd /d "%~dp0\..\.."

set "BACKUP_DIR=tools\local-backups\stage64f"

copy /Y "%BACKUP_DIR%\assets__css__components__ui-surface__dropdowns-menus.css.bak" "assets\css\components\ui-surface\dropdowns-menus.css" >nul
if errorlevel 1 exit /b %errorlevel%

copy /Y "%BACKUP_DIR%\assets__css__components__ui-surface__forms-controls.css.bak" "assets\css\components\ui-surface\forms-controls.css" >nul
if errorlevel 1 exit /b %errorlevel%

copy /Y "%BACKUP_DIR%\assets__css__components__ui-surface__cards-media.css.bak" "assets\css\components\ui-surface\cards-media.css" >nul
if errorlevel 1 exit /b %errorlevel%

copy /Y "%BACKUP_DIR%\assets__css__components__chat-composer.css.bak" "assets\css\components\chat-composer.css" >nul
if errorlevel 1 exit /b %errorlevel%

copy /Y "%BACKUP_DIR%\assets__css__pages__perfil-reviews-page.css.bak" "assets\css\pages\perfil-reviews-page.css" >nul
if errorlevel 1 exit /b %errorlevel%

copy /Y "%BACKUP_DIR%\assets__css__pages__mensagens__page-foundation-contract.css.bak" "assets\css\pages\mensagens\page-foundation-contract.css" >nul
if errorlevel 1 exit /b %errorlevel%

copy /Y "%BACKUP_DIR%\assets__css__pages__mensagens__responsive-pass.css.bak" "assets\css\pages\mensagens\responsive-pass.css" >nul
if errorlevel 1 exit /b %errorlevel%

copy /Y "%BACKUP_DIR%\assets__css__pages__perfil.css.bak" "assets\css\pages\perfil.css" >nul
if errorlevel 1 exit /b %errorlevel%

echo Stage 64F rollback restored CSS backups.
endlocal
