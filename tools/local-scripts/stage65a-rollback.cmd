@echo off
setlocal
set STAGE=stage65a
copy /Y "tools\local-backups\%STAGE%\assets\css\patterns\app-topbar.css.bak" "assets\css\patterns\app-topbar.css" >nul
copy /Y "tools\local-backups\%STAGE%\assets\css\patterns\community-request-modal.css.bak" "assets\css\patterns\community-request-modal.css" >nul
copy /Y "tools\local-backups\%STAGE%\assets\css\patterns\community-room-layout.css.bak" "assets\css\patterns\community-room-layout.css" >nul
copy /Y "tools\local-backups\%STAGE%\assets\css\pages\configuracoes\mobile-header-drawer.css.bak" "assets\css\pages\configuracoes\mobile-header-drawer.css" >nul
copy /Y "tools\local-backups\%STAGE%\assets\css\pages\perfil-budget-modal\success-state-layout.css.bak" "assets\css\pages\perfil-budget-modal\success-state-layout.css" >nul
copy /Y "tools\local-backups\%STAGE%\assets\css\pages\perfil-budget-modal\select-layering.css.bak" "assets\css\pages\perfil-budget-modal\select-layering.css" >nul
copy /Y "tools\local-backups\%STAGE%\assets\css\pages\mensagens\mobile-header-drawer.css.bak" "assets\css\pages\mensagens\mobile-header-drawer.css" >nul
copy /Y "tools\local-backups\%STAGE%\assets\css\pages\mensagens\message-boot.css.bak" "assets\css\pages\mensagens\message-boot.css" >nul
copy /Y "tools\local-backups\%STAGE%\assets\css\pages\shell-normalize.css.bak" "assets\css\pages\shell-normalize.css" >nul
copy /Y "tools\local-backups\%STAGE%\assets\css\pages\detalhe-anuncio\detail-symbols.css.bak" "assets\css\pages\detalhe-anuncio\detail-symbols.css" >nul
copy /Y "tools\local-backups\%STAGE%\assets\css\pages\home-refresh\bridges.css.bak" "assets\css\pages\home-refresh\bridges.css" >nul
copy /Y "tools\local-backups\%STAGE%\assets\css\pages\search-results\workers-index-layout-contract.css.bak" "assets\css\pages\search-results\workers-index-layout-contract.css" >nul
echo Stage 65A rollback concluido.
endlocal
