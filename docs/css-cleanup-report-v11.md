# CSS Cleanup v11 — Comunidade e Comunidade Interna

## Status

- Organização estrutural: 79/100
- Risco de regressão visual: médio-baixo
- Risco de CSS duplicado/morto: médio
- Risco de acoplamento entre páginas: médio-baixo

## Alterações

### comunidade.css

O arquivo deixou de ser monolítico e passou a ser um manifesto de imports. A ordem da cascata foi preservada para evitar alteração visual.

Nova estrutura:

- assets/css/pages/comunidade/base-and-discovery.css
- assets/css/pages/comunidade/internal-modal-legacy.css
- assets/css/pages/comunidade/user-communities-order.css
- assets/css/pages/comunidade/entry-create-modals.css
- assets/css/pages/comunidade/mobile-rescue.css
- assets/css/pages/comunidade/discovery-v2.css
- assets/css/pages/comunidade/discovery-v3-refinement.css
- assets/css/pages/comunidade/compact-cards-v4.css
- assets/css/pages/comunidade/filters-progressive.css
- assets/css/pages/comunidade/mobile-interaction-contract.css

### comunidade-interna.css

O arquivo também virou manifesto e foi dividido por responsabilidades da sala/comunidade interna.

Nova estrutura:

- assets/css/pages/comunidade-interna/base.css
- assets/css/pages/comunidade-interna/internal-modal-legacy.css
- assets/css/pages/comunidade-interna/fullscreen-shell.css
- assets/css/pages/comunidade-interna/final-room-layout.css
- assets/css/pages/comunidade-interna/full-bleed-fix.css
- assets/css/pages/comunidade-interna/visual-refinement.css
- assets/css/pages/comunidade-interna/user-communities-order.css
- assets/css/pages/comunidade-interna/entry-create-modals.css
- assets/css/pages/comunidade-interna/mobile-rescue.css
- assets/css/pages/comunidade-interna/composer-standard.css
- assets/css/pages/comunidade-interna/compact-final-adjustments.css
- assets/css/pages/comunidade-interna/chat-isolation-refinements.css
- assets/css/pages/comunidade-interna/members-panel.css
- assets/css/pages/comunidade-interna/composer-media-actions.css
- assets/css/pages/comunidade-interna/mobile-interaction-contract.css

## HTML

- comunidade.html e comunidade-interna.html deixam de carregar pedidos.css diretamente.
- Ambas passam a carregar internal-list-pages.css como contrato compartilhado.
- As versões de cache dos CSS de comunidade foram atualizadas para v11.

## Observação técnica

Esta etapa não removeu CSS agressivamente. O foco foi quebrar monólitos e preparar a próxima limpeza, onde regras duplicadas poderão ser comparadas com maior segurança.
