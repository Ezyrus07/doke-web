@echo off
setlocal
cd /d "%~dp0\..\.."

echo Revertendo Stage 63M...
copy /Y "tools\local-backups\stage63m\assets\css\pages\configuracoes\mobile-header-drawer.css" "assets\css\pages\configuracoes\mobile-header-drawer.css" >nul
copy /Y "tools\local-backups\stage63m\assets\css\pages\configuracoes\mobile-settings-index.css" "assets\css\pages\configuracoes\mobile-settings-index.css" >nul
copy /Y "tools\local-backups\stage63m\assets\css\pages\configuracoes.css" "assets\css\pages\configuracoes.css" >nul

echo Stage 63M revertido. Rode os audits para confirmar.
endlocal
