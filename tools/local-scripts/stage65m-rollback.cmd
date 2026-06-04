@echo off
setlocal
if exist "tools\local-backups\stage65m\assets\css\pages\orders-hero.css.bak" copy /Y "tools\local-backups\stage65m\assets\css\pages\orders-hero.css.bak" "assets\css\pages\orders-hero.css" >nul
if exist "tools\local-backups\stage65m\assets\css\patterns\ad-process-steps.css.bak" copy /Y "tools\local-backups\stage65m\assets\css\patterns\ad-process-steps.css.bak" "assets\css\patterns\ad-process-steps.css" >nul
echo Stage 65M rollback completed.
endlocal
