@echo off
setlocal

copy /Y "tools\local-backups\stage64c\assets\css\pages\notificacoes\base-layout.css.bak" "assets\css\pages\notificacoes\base-layout.css" || exit /b 1
copy /Y "tools\local-backups\stage64c\assets\css\pages\perfil-budget-modal\doke-select-standard.css.bak" "assets\css\pages\perfil-budget-modal\doke-select-standard.css" || exit /b 1
copy /Y "tools\local-backups\stage64c\assets\css\pages\perfil-budget-modal\success-state-layout.css.bak" "assets\css\pages\perfil-budget-modal\success-state-layout.css" || exit /b 1
copy /Y "tools\local-backups\stage64c\assets\css\pages\anunciar-servico.css.bak" "assets\css\pages\anunciar-servico.css" || exit /b 1
copy /Y "tools\local-backups\stage64c\assets\css\components\profile\profile-services-grid.css.bak" "assets\css\components\profile\profile-services-grid.css" || exit /b 1

echo Stage 64C rollback restored the previous CSS files.
endlocal
