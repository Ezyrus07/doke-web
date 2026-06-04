@echo off
setlocal
set ROOT=%~dp0..\..
set BACKUP=%ROOT%\tools\local-backups\stage65b
if not exist "%BACKUP%" (
  echo Stage 65B backup folder not found: %BACKUP%
  exit /b 1
)
for /R "%BACKUP%" %%F in (*.html) do (
  set "SRC=%%F"
  call set "REL=%%SRC:%BACKUP%\=%%"
  call copy /Y "%%F" "%ROOT%\%%REL%%" >nul
)
echo Stage 65B rollback restored backed up HTML files.
endlocal
