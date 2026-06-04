@echo off
setlocal

echo [stage64d] Restoring backed up CSS files...
copy /Y "tools\local-backups\stage64d\assets\css\pages\internal-list-pages.css.bak" "assets\css\pages\internal-list-pages.css" >nul || exit /b 1
copy /Y "tools\local-backups\stage64d\assets\css\pages\tornar-profissional.css.bak" "assets\css\pages\tornar-profissional.css" >nul || exit /b 1
copy /Y "tools\local-backups\stage64d\assets\css\pages\perfil-budget-modal\centering-upload-success.css.bak" "assets\css\pages\perfil-budget-modal\centering-upload-success.css" >nul || exit /b 1

echo [stage64d] Rollback completed. Run audits again.
