Base em consolidação estrutural a partir do ZIP original.

Rodada atual de limpeza segura:
- consolidado o desktop header do index em um único bloco dono dentro de `assets/css/core/layout-topbar.css`
- removidos blocos duplicados antigos de `home-index-topbar` que disputavam a mesma faixa desktop
- removido conflito que escondia o botão de expandir/retrair a sidebar no index desktop
- mantido o restante do CSS histórico onde ainda havia risco de regressão

Mapa estrutural atual:
- `assets/css/core/layout-topbar.css` = shell/topbar/sidebar global
- `assets/css/pages/home-refresh.css` = home/vitrine e busca principal
- `assets/css/pages/pedidos.css` = header operacional e conteúdo de pedidos
- `assets/css/pages/notificacoes.css` = header operacional e conteúdo de notificações

Pendências ainda abertas:
- revisar duplicação residual de regras de desktop dentro de `home-refresh.css`
- consolidar padrões repetidos de header interno entre `pedidos.css` e `notificacoes.css`
- auditar depois `mensagens.html` para confirmar se o padrão interno já está replicável

Princípio adotado:
- não apagar regras com risco de sustentar páginas ativas
- priorizar consolidação por dono de camada em vez de empilhar override novo
