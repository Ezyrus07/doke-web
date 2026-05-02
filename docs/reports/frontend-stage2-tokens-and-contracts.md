# Frontend Stage 2 — Tokens e contratos responsivos

## Objetivo
Estabelecer uma base de tokens mais completa e reforçar contratos compartilhados de cards sem redesenhar páginas caso a caso.

## Alterações executadas
- Expandido `assets/css/core/tokens.css` com aliases semânticos de radius, spacing, typography e transições.
- Criado espelho inicial em `src/styles/tokens/index.css` para futura migração de componentes.
- Criado `src/styles/index.css` como entrypoint leve para a camada `src`.
- Atualizado `assets/css/components/cards/card-grid-contract.css` para consumir tokens e proteger conteúdo responsivo.
- Atualizados cache-busters de `card-grid-contract.css` nas páginas que importam esse contrato.

## Decisão técnica
Não foi feita migração para framework nesta etapa. A prioridade continua sendo estabilizar os contratos CSS atuais antes de levar dívida para `src`.

## Top arquivos por `!important` — auditoria atual

- `assets/css/pages/home/mobile/sections.css` — 1042
- `assets/css/pages/home/index-final-refinement.css` — 962
- `assets/css/components/internal/chat-workspace-contract.css` — 867
- `assets/css/pages/home/chrome.css` — 771
- `assets/css/components/shell/doke-shell-contract.css` — 722
- `assets/css/components/navigation/app-mobile-header-contract.css` — 700
- `assets/css/pages/home/mobile/search.css` — 484
- `assets/css/core/layout/responsive-shell.css` — 479
- `assets/css/pages/home-search-chrome.css` — 429
- `assets/css/pages/home.css` — 400
- `assets/css/components/navigation/mobile-search-header-shared.css` — 348
- `assets/css/components/before-after-workers-preview/mobile-comment-sheets.css` — 308
- `assets/css/pages/home-refresh/mobile-index-pass.css` — 287
- `assets/css/components/navigation/mobile-chrome-lock.css` — 277
- `assets/css/components/before-after-workers-preview/workers-mobile-fullscreen-fix.css` — 268
- `assets/css/components/overlays/mobile-action-surface-contract.css` — 260
- `assets/css/pages/home-overlays/workers-feed-polish.css` — 250
- `assets/css/pages/home-sections.css` — 242
- `assets/css/components/shell/mobile-app-shell.css` — 240
- `assets/css/pages/home/mobile/drawer.css` — 236

## Top arquivos por `border-radius` literal — auditoria atual

- `assets/css/pages/pedidos.css` — 73
- `assets/css/pages/home/layout.css` — 70
- `assets/css/pages/home-sections.css` — 66
- `assets/css/pages/home/sections.css` — 50
- `assets/css/pages/home/index-final-refinement.css` — 46
- `assets/css/pages/detalhe-anuncio.css` — 45
- `assets/css/pages/mensagens/base-layout.css` — 44
- `assets/css/pages/carteira.css` — 41
- `assets/css/pages/perfil.css` — 39
- `assets/css/pages/home/mobile/sections.css` — 38
- `assets/css/components/internal/chat-workspace-contract.css` — 37
- `assets/css/pages/home/chrome.css` — 36
- `assets/css/pages/pagamento.css` — 34
- `assets/css/pages/perfil-publications.css` — 32
- `assets/css/core/ui/global-components.css` — 32
- `assets/css/pages/home-refresh/mobile-index-pass.css` — 29
- `assets/css/pages/orcamento.css` — 28
- `assets/css/pages/post-service.css` — 26
- `assets/css/pages/comunidade/base-and-discovery.css` — 26
- `assets/css/pages/comunidade-interna/base.css` — 26

## Próxima etapa recomendada
Stage 3 deve atacar contratos de busca/filtros e, em seguida, substituir radius literal nos arquivos de maior impacto: `pedidos.css`, `home/layout.css`, `home-sections.css`, `detalhe-anuncio.css`, `carteira.css` e `perfil.css`.
