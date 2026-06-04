# CSS Cleanup Report v20

## Alvo

- `assets/css/pages/mensagens.css`
- `assets/css/pages/notificacoes.css`

## O que mudou

Os dois arquivos deixaram de ser monólitos e passaram a funcionar como manifestos de imports. A ordem original da cascata foi preservada para reduzir risco de regressão visual.

## Novos módulos

### Mensagens

- `assets/css/pages/mensagens/base-layout.css`
- `assets/css/pages/mensagens/mobile-header-drawer.css`
- `assets/css/pages/mensagens/responsive-pass.css`
- `assets/css/pages/mensagens/community-parity.css`
- `assets/css/pages/mensagens/final-standardization.css`
- `assets/css/pages/mensagens/mobile-interaction-contract.css`

### Notificações

- `assets/css/pages/notificacoes/base-layout.css`
- `assets/css/pages/notificacoes/header-additions.css`
- `assets/css/pages/notificacoes/internal-page-header.css`
- `assets/css/pages/notificacoes/pedidos-parity.css`
- `assets/css/pages/notificacoes/mobile-header-compact.css`
- `assets/css/pages/notificacoes/mobile-header-alignment.css`
- `assets/css/pages/notificacoes/selection-parity.css`
- `assets/css/pages/notificacoes/responsive-pass.css`
- `assets/css/pages/notificacoes/selection-panel-card.css`
- `assets/css/pages/notificacoes/selection-state-fix.css`
- `assets/css/pages/notificacoes/mobile-interaction-contract.css`

## Critério técnico

Nenhuma regra visual foi removida nesta etapa. A mudança foi estrutural: separar responsabilidades, manter o arquivo público como ponto de entrada e facilitar futuras remoções de compatibilidade.
