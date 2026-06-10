# CSS Cleanup Stage 39 — pedidos.html

## Escopo
Saneamento estrutural de `pedidos.html` após os stages de home, perfil, mensagens, detalhe-anuncio e carteira.

## Ações
- Removidas dependências diretas de contratos antigos de shell/header/rail/tablet/mobile/cards que não pertencem mais à estrutura-alvo.
- Adicionado `assets/css/layout/header.css` como contrato limpo de header.
- Removido `!important` dos arquivos ainda ativos na cascata de `pedidos.html`.
- Mantido foco em previsibilidade da cascata, não em refinamento visual.

## Links CSS removidos do HTML
- <link rel="stylesheet" href="assets/css/components/shell/page-container-contract.css?v=20260510-mobile-width-contract-v1">
- <link rel="stylesheet" href="assets/css/components/shell/mobile-app-shell.css?v=20260530-mobile-first-paint-regression-v3">
- <link rel="stylesheet" href="assets/css/components/domain/doke-domain-cards.css?v=20260503-canonical-service-card-v3-contract">
- <link rel="stylesheet" href="assets/css/components/layout/doke-layout-system.css?v=20260501-layout-system-v1">  <link rel="stylesheet" href="assets/css/components/flows/doke-product-flows.css?v=20260501-product-flows-v1">  <link rel="stylesheet" href="assets/css/components/shell/desktop-shell.css?v=20260501-desktop-contract-v1">
- <link rel="stylesheet" href="assets/css/components/shell/desktop-sidebar.css?v=20260501-desktop-contract-v1">
- <link rel="stylesheet" href="assets/css/components/shell/desktop-topbar.css?v=20260501-desktop-contract-v1">
- <link rel="stylesheet" href="assets/css/components/shell/desktop-search.css?v=20260501-desktop-contract-v1">
- <link rel="stylesheet" href="assets/css/components/shell/responsive-boundary.css?v=20260501-responsive-boundary-v1">
- <link rel="stylesheet" href="assets/css/components/shell/mobile-base-stability.css?v=20260501-mobile-base-stability-v1">
- <link rel="stylesheet" href="assets/css/components/shell/app-header.css?v=20260517-header-gap-v3">  <link rel="stylesheet" href="assets/css/components/layout/responsive-page-contract.css?v=20260514-header-alignment-audit-v2">
- <link rel="stylesheet" href="assets/css/components/shell/doke-shell-contract.css?v=20260531-ipad-scroll-stability-v1">
- <link rel="stylesheet" href="assets/css/components/shell/app-header-canonical-contract.css?v=20260525-header-canonical-v3">
- <link rel="stylesheet" href="assets/css/components/layout/professional-responsive-layout.css?v=20260525-professional-responsive-layout-v1">
- <link rel="stylesheet" href="assets/css/components/layout/responsive-priority-contract.css?v=20260525-p1-objective-v1">
- <link rel="stylesheet" href="assets/css/components/layout/responsive-priority-cards.css?v=20260525-p2-objective-v1">
- <link rel="stylesheet" href="assets/css/components/layout/index-compact-card-contract.css?v=20260525-index-compact-card-contract-v2">
- <link rel="stylesheet" href="assets/css/components/shell/tablet-internal-rail-contract.css?v=20260526-tablet-internal-rail-contract-v1">
- <link rel="stylesheet" href="assets/css/components/shell/ipad-safari-scroll.css?v=20260601-shell-scroll-v1">

## Resultado
- `!important` ativo na cascata de `pedidos.html`: 0
- `!important` total em `assets/css`: 11468
- CSS com chaves desbalanceadas: 0

## Riscos
Alto risco visual em pedidos: header interno, filtros, seleção, agenda, cards de pedido, action panels e responsivo. O critério nesta fase é abrir a página, manter conteúdo principal e não travar navegação/scroll.
