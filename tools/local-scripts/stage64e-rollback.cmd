@echo off
setlocal
copy /Y "tools\local-backups\stage64e\assets\css\components\cards\card-grid-contract.css.bak" "assets\css\components\cards\card-grid-contract.css" >nul || exit /b 1
copy /Y "tools\local-backups\stage64e\assets\css\patterns\internal-pages.css.bak" "assets\css\patterns\internal-pages.css" >nul || exit /b 1
copy /Y "tools\local-backups\stage64e\assets\css\core\ui\patterns.css.bak" "assets\css\core\ui\patterns.css" >nul || exit /b 1
echo Stage 64E rollback completed.
endlocal
