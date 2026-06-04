@echo off
setlocal
set "ROOT=%~dp0..\.."
copy /Y "%ROOT%\tools\local-backups\stage65f\assets\css\pages\home\mobile\categories.css.bak" "%ROOT%\assets\css\pages\home\mobile\categories.css" >nul
if errorlevel 1 exit /b 1
copy /Y "%ROOT%\tools\local-backups\stage65f\assets\css\pages\home\layout.css.bak" "%ROOT%\assets\css\pages\home\layout.css" >nul
if errorlevel 1 exit /b 1
echo Stage 65F rollback applied.
endlocal
