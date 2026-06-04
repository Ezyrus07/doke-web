@echo off
setlocal
set "ROOT=%~dp0..\.."

copy /Y "%ROOT%\tools\local-backups\stage63k\assets\css\components\before-after-workers-preview\publication-light-modal.css.bak" "%ROOT%\assets\css\components\before-after-workers-preview\publication-light-modal.css" >nul || exit /b 1
copy /Y "%ROOT%\tools\local-backups\stage63k\assets\css\components\before-after-workers-preview\before-after-responsive.css.bak" "%ROOT%\assets\css\components\before-after-workers-preview\before-after-responsive.css" >nul || exit /b 1
copy /Y "%ROOT%\tools\local-backups\stage63k\assets\css\components\before-after-workers-preview\before-after-shell.css.bak" "%ROOT%\assets\css\components\before-after-workers-preview\before-after-shell.css" >nul || exit /b 1
copy /Y "%ROOT%\tools\local-backups\stage63k\assets\css\components\before-after-workers-preview\before-after-sidebar.css.bak" "%ROOT%\assets\css\components\before-after-workers-preview\before-after-sidebar.css" >nul || exit /b 1

echo Stage 63K rollback aplicado. Rode os audits em seguida.
endlocal
