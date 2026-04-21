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

- consolidado o `service-card` em `assets/css/components/cards/service-card.css` e removido o bloco proprietário duplicado de `home-sections.css`
- arquivadas telas experimentais órfãs (`dssadas.html`, `hero-comparativo.html`) fora da base ativa
- normalizados textos e identificadores com encoding corrompido nas áreas críticas de shell, busca e perfil

## Faxina conservadora — 2026-04-21
- removidos diretórios arquivados sem uso em runtime (`archive/experiments`, `archive/legacy-css`, `archive/legacy-home-css`, `archive/legacy-home-js`, `archive/legacy-home-mobile`)
- simplificada a classe duplicada do workspace em `mensagens.html`
- removidos bindings/constantes descartáveis em `assets/js/pages/mensagens.js`
- consolidado o controle de toggles e painéis de filtro/seleção em `assets/js/pages/mensagens.js` para reduzir repetição sem alterar o comportamento esperado
