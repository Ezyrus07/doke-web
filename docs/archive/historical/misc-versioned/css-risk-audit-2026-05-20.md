# Auditoria de CSS perigoso — Desktop freeze antes do mobile

**Data:** 2026-05-20  
**Escopo:** auditoria técnica de risco CSS sem redesign e sem refatoração ampla.  
**Regra aplicada:** só foram corrigidas duplicações/imports obviamente objetivos; CSS visual/subjetivo foi apenas registrado.

## Resumo executivo

- CSS analisado: `assets/css/**/*.css`.
- HTMLs principais da raiz considerados: `*.html`.
- Arquivos CSS de página com mais de 1000 linhas: **25**.
- Correções aplicadas: remoção de imports duplicados objetivos em HTML/CSS.
- Refatoração estrutural: **não executada**, para preservar o baseline visual desktop.

## Correções aplicadas

| Arquivo | Correção | Motivo | Risco visual |
|---|---|---|---|
| `carteira.html` | Removido segundo import idêntico de `assets/css/components/overlays/financial-modal-system.css?v=20260519-financial-modal-system-v6` | Import duplicado objetivo do mesmo arquivo/versionamento | Baixo: mesmo CSS carregado duas vezes |
| `mensagens.html` | Removido segundo import idêntico de `assets/css/components/overlays/financial-modal-system.css?v=20260519-financial-modal-system-v6` | Import duplicado objetivo do mesmo arquivo/versionamento | Baixo: mesmo CSS carregado duas vezes |
| `assets/css/pages/search-results.css` | Removido segundo `@import` idêntico de `../components/cards/service-card.css?v=20260503-canonical-card-contract-v2` | `@import` duplicado objetivo | Baixo: mesmo CSS carregado duas vezes |

## Arquivos CSS por página com mais de 1000 linhas

| Arquivo | Linhas | `!important` | Severidade | Observação |
|---|---:|---:|---|---|
| `assets/css/pages/detalhe-anuncio.css` | 9311 | 3308 | Crítica | Alto risco para mobile por acoplamento e overrides. |
| `assets/css/pages/perfil-reference-hero.css` | 8263 | 4173 | Crítica | Alto risco para mobile por acoplamento e overrides. |
| `assets/css/pages/home.css` | 6680 | 3061 | Crítica | Alto risco para mobile por acoplamento e overrides. |
| `assets/css/pages/mensagens/desktop-redesign.css` | 6641 | 3546 | Crítica | Alto risco para mobile por acoplamento e overrides. |
| `assets/css/pages/carteira.css` | 5569 | 772 | Crítica | Alto risco para mobile por acoplamento e overrides. |
| `assets/css/pages/home-sections.css` | 3664 | 377 | Alta | Risco relevante antes de responsividade. |
| `assets/css/pages/perfil/mobile-public-profile.css` | 3129 | 1805 | Crítica | Alto risco para mobile por acoplamento e overrides. |
| `assets/css/pages/pedidos.css` | 3061 | 45 | Alta | Risco relevante antes de responsividade. |
| `assets/css/pages/perfil.css` | 3040 | 12 | Alta | Risco relevante antes de responsividade. |
| `assets/css/pages/pedidos/orders-command-center.css` | 2928 | 4 | Alta | Risco relevante antes de responsividade. |
| `assets/css/pages/home/sections.css` | 2853 | 267 | Alta | Risco relevante antes de responsividade. |
| `assets/css/pages/home/layout.css` | 2754 | 8 | Alta | Risco relevante antes de responsividade. |
| `assets/css/pages/home/mobile/sections.css` | 2185 | 1151 | Crítica | Alto risco para mobile por acoplamento e overrides. |
| `assets/css/pages/search-results.css` | 1923 | 813 | Alta | Risco relevante antes de responsividade. |
| `assets/css/pages/home/index-final-refinement.css` | 1782 | 962 | Alta | Risco relevante antes de responsividade. |
| `assets/css/pages/home/chrome.css` | 1636 | 771 | Alta | Risco relevante antes de responsividade. |
| `assets/css/pages/detalhe-anuncio/detail-legacy.css` | 1629 | 11 | Média | Monitorar antes de consolidar breakpoints. |
| `assets/css/pages/home-search-chrome.css` | 1600 | 435 | Alta | Risco relevante antes de responsividade. |
| `assets/css/pages/perfil-publications.css` | 1418 | 198 | Média | Monitorar antes de consolidar breakpoints. |
| `assets/css/pages/pagamento-profissional.css` | 1404 | 3 | Média | Monitorar antes de consolidar breakpoints. |
| `assets/css/pages/mensagens/base-layout.css` | 1403 | 23 | Média | Monitorar antes de consolidar breakpoints. |
| `assets/css/pages/home-refresh/mobile-index-pass.css` | 1290 | 287 | Alta | Risco relevante antes de responsividade. |
| `assets/css/pages/configuracoes.css` | 1107 | 5 | Média | Monitorar antes de consolidar breakpoints. |
| `assets/css/pages/comunidade/base-and-discovery.css` | 1041 | 1 | Média | Monitorar antes de consolidar breakpoints. |
| `assets/css/pages/comunidade/photo-discovery.css` | 1023 | 24 | Média | Monitorar antes de consolidar breakpoints. |

## Maiores concentrações de `!important`

| Arquivo | `!important` | Linhas | Leitura técnica |
|---|---:|---:|---|
| `assets/css/pages/perfil-reference-hero.css` | 4173 | 8263 | Provável CSS de contrato/override; perigoso para mobile. |
| `assets/css/pages/mensagens/desktop-redesign.css` | 3546 | 6641 | Provável CSS de contrato/override; perigoso para mobile. |
| `assets/css/pages/detalhe-anuncio.css` | 3308 | 9311 | Provável CSS de contrato/override; perigoso para mobile. |
| `assets/css/pages/home.css` | 3061 | 6680 | Provável CSS de contrato/override; perigoso para mobile. |
| `assets/css/pages/perfil/mobile-public-profile.css` | 1805 | 3129 | Provável CSS de contrato/override; perigoso para mobile. |
| `assets/css/components/internal/chat-workspace-contract.css` | 1440 | 2866 | Provável CSS de contrato/override; perigoso para mobile. |
| `assets/css/components/shell/doke-shell-contract.css` | 1259 | 3503 | Provável CSS de contrato/override; perigoso para mobile. |
| `assets/css/pages/home/mobile/sections.css` | 1151 | 2185 | Provável CSS de contrato/override; perigoso para mobile. |
| `assets/css/pages/home/index-final-refinement.css` | 962 | 1782 | Provável CSS de contrato/override; perigoso para mobile. |
| `assets/css/pages/search-results.css` | 813 | 1923 | Provável CSS de contrato/override; perigoso para mobile. |
| `assets/css/components/overlays/financial-modal-system.css` | 776 | 1367 | Provável CSS de contrato/override; perigoso para mobile. |
| `assets/css/pages/carteira.css` | 772 | 5569 | Provável CSS de contrato/override; perigoso para mobile. |
| `assets/css/pages/home/chrome.css` | 771 | 1636 | Provável CSS de contrato/override; perigoso para mobile. |
| `assets/css/components/navigation/app-mobile-header-contract.css` | 700 | 1168 | Provável CSS de contrato/override; perigoso para mobile. |
| `assets/css/components/before-after-workers-preview.css` | 672 | 1271 | Provável CSS de contrato/override; perigoso para mobile. |
| `assets/css/pages/home/mobile/search.css` | 490 | 796 | Revisar na consolidação, sem remover agora. |
| `assets/css/core/layout/responsive-shell.css` | 479 | 1107 | Revisar na consolidação, sem remover agora. |
| `assets/css/components/domain/doke-domain-cards.css` | 453 | 886 | Revisar na consolidação, sem remover agora. |
| `assets/css/pages/home-search-chrome.css` | 435 | 1600 | Revisar na consolidação, sem remover agora. |
| `assets/css/components/shell/app-header.css` | 412 | 790 | Revisar na consolidação, sem remover agora. |

## Duplicações prováveis por família de componente

### sidebar

| Arquivo | Tipo | Ocorrências aproximadas | Amostras |
|---|---|---:|---|
| `assets/css/components/shell/doke-shell-contract.css` | component | 177 | `body.internal-shell-page .sidebar {`<br>`body.internal-shell-page .sidebar[data-shell-sidebar] {`<br>`body[data-page].internal-shell-page > .app-shell > .sidebar {` |
| `assets/css/pages/mensagens/desktop-redesign.css` | mensagens | 145 | `body.messages-page-shell .messages-sidebar {`<br>`body.messages-page-shell .messages-sidebar::after {`<br>`body.messages-page-shell .messages-sidebar > .messages-sidebar-search:not(.messages-sidebar-search--modern) {` |
| `assets/css/pages/internal-shell.css` | page | 100 | `.shell-home .sidebar {`<br>`.shell-home .sidebar .sidebar__header {`<br>`.shell-home .sidebar .sidebar__nav {` |
| `assets/css/components/internal/chat-workspace-contract.css` | component | 70 | `body.messages-page-shell .messages-sidebar {`<br>`body.messages-page-shell .messages-sidebar::-webkit-scrollbar {`<br>`body.messages-page-shell .messages-sidebar::-webkit-scrollbar-thumb {` |
| `assets/css/core/layout/responsive-base.css` | other | 60 | `.sidebar {`<br>`body.sidebar-open .sidebar {`<br>`body.sidebar-open .mobile-scrim {` |
| `assets/css/components/shell/app-shell.css` | component | 52 | `body.app-shell-page .sidebar {`<br>`body.app-shell-page .sidebar {`<br>`body.app-shell-page .sidebar__brand {` |
| `assets/css/core/layout/responsive-shell.css` | other | 49 | `.sidebar {`<br>`body.home-index-shell .sidebar__collapse-button {`<br>`body.sidebar-open {` |
| `assets/css/pages/shell-normalize.css` | page | 44 | `body.shell-home .sidebar {`<br>`body.shell-home .sidebar__brand {`<br>`body.shell-home .sidebar__group {` |
| `assets/css/pages/home-shell.css` | page | 37 | `body.shell-home:not(.internal-shell-page) .sidebar {`<br>`body.shell-home:not(.internal-shell-page) .sidebar {`<br>`body.shell-home:not(.internal-shell-page) .sidebar__brand {` |
| `assets/css/pages/home.css` | page | 37 | `body.home-index-shell .sidebar {`<br>`body.home-index-shell .sidebar::-webkit-scrollbar {`<br>`html body.sidebar-collapsed.home-index-shell.doke-app-shell-page {` |

### header

| Arquivo | Tipo | Ocorrências aproximadas | Amostras |
|---|---|---:|---|
| `assets/css/components/shell/app-header.css` | component | 748 | `.app-header {`<br>`.app-header .home-side-meta__group {`<br>`.app-header .home-side-meta__group--primary {` |
| `assets/css/components/shell/doke-shell-contract.css` | component | 610 | `body.internal-shell-page .topbar--location {`<br>`body.internal-shell-page .topbar__right {`<br>`body.internal-shell-page .topbar__left {` |
| `assets/css/pages/detalhe-anuncio.css` | page | 480 | `.detail-index-header {`<br>`.detail-index-header__right {`<br>`.detail-index-header__left {` |
| `assets/css/components/navigation/app-mobile-header-contract.css` | component | 340 | `body.orders-page-shell .orders-page-header {`<br>`body.orders-page-shell .orders-page-header__hero {`<br>`body.orders-page-shell .orders-page-header__hero-profile {` |
| `assets/css/pages/home-search-chrome.css` | page | 263 | `.mobile-header-location {`<br>`body.home-index-shell .topbar {`<br>`body.home-index-shell .topbar__right {` |
| `assets/css/components/shell/app-shell.css` | component | 219 | `body.app-shell-page .mobile-header-logo {`<br>`.internal-mobile-header .notifications-page-header__toolbar {`<br>`.internal-mobile-header .notifications-page-header__actions {` |
| `assets/css/patterns/app-topbar.css` | other | 211 | `.app-topbar.internal-page-topbar {`<br>`.app-topbar__right {`<br>`.app-topbar__left {` |
| `assets/css/pages/home.css` | page | 168 | `body.home-index-shell .home-index-topbar .home-tablet-topbar__right-clone .home-side-meta__profile-caret-button {`<br>`body.home-index-shell .home-index-topbar .home-tablet-topbar__right-clone .home-side-meta__profile-caret-button {`<br>`body.home-index-shell .home-index-topbar .home-tablet-topbar__right-clone .home-side-meta__profile-caret-button svg {` |
| `assets/css/core/layout/topbar.css` | other | 148 | `.topbar {`<br>`body.home-index-shell .home-index-topbar {`<br>`body.home-index-shell .home-index-topbar .topbar__center {` |
| `assets/css/pages/internal-list-pages.css` | page | 144 | `.orders-index-topbar {`<br>`body.orders-page-shell .orders-page-header__toolbar {`<br>`.orders-page-header {` |

### composer

| Arquivo | Tipo | Ocorrências aproximadas | Amostras |
|---|---|---:|---|
| `assets/css/pages/mensagens/desktop-redesign.css` | mensagens | 241 | `body.messages-page-shell .messages-composer {`<br>`body.messages-page-shell .messages-composer__tools {`<br>`body.messages-page-shell .messages-composer__send {` |
| `assets/css/components/internal/chat-workspace-contract.css` | component | 94 | `body.messages-page-shell .messages-composer {`<br>`body.messages-page-shell .messages-composer textarea {`<br>`body.messages-page-shell .messages-composer__send {` |
| `assets/css/components/chat-composer.css` | component | 88 | `body.community-room-shell .doke-chat-composer {`<br>`body.community-room-shell .doke-chat-composer__tools {`<br>`body.community-room-shell .doke-chat-composer__send {` |
| `assets/css/pages/pedidos/orders-chat.css` | page | 33 | `body.orders-page-shell .orders-chat-panel__composer {`<br>`body.orders-page-shell .orders-chat-panel__composer input {`<br>`body.orders-page-shell .orders-chat-panel__composer input:focus {` |
| `assets/css/pages/mensagens/mobile-header-drawer.css` | mensagens | 24 | `body.messages-page-shell .messages-composer {`<br>`body.messages-page-shell .messages-composer__tools {`<br>`body.messages-page-shell .messages-composer__field {` |
| `assets/css/pages/mensagens/base-layout.css` | mensagens | 23 | `body.messages-page-shell .messages-composer {`<br>`body.messages-page-shell .messages-composer__tools {`<br>`body.messages-page-shell .messages-composer__field {` |
| `assets/css/patterns/community-room-layout.css` | other | 11 | `.community-chat-composer {`<br>`.community-chat-composer input {`<br>`.community-chat-composer input:focus {` |
| `assets/css/pages/comunidade-interna.css` | page | 8 | `body[data-page="comunidade-interna"].messages-page-shell .messages-composer.community-room-composer {`<br>`body[data-page="comunidade-interna"].messages-page-shell .messages-composer__tool.community-room-composer__tool {`<br>`body[data-page="comunidade-interna"].messages-page-shell .messages-composer__field.community-room-composer__field {` |
| `assets/css/pages/mensagens/community-parity.css` | mensagens | 8 | `body.messages-page-shell .messages-composer__send {`<br>`body.messages-page-shell .messages-composer {`<br>`body.messages-page-shell .messages-composer__field {` |
| `assets/css/patterns/responsive-polish.css` | other | 8 | `body.community-room-shell .community-chat-composer{ width:100%!important; max-width:100%!important; min-width:0!important; box-siz`<br>`body.community-room-shell .community-chat-composer__tools{ flex-wrap:nowrap!important; overflow-x:auto; scrollbar-width:none; }`<br>`body.community-room-shell .community-chat-composer__tools::-webkit-scrollbar{ display:none; }` |

### cards

| Arquivo | Tipo | Ocorrências aproximadas | Amostras |
|---|---|---:|---|
| `assets/css/components/domain/doke-domain-cards.css` | component | 774 | `):not(.doke-card):not(.doke-surface) {`<br>`:where(.doke-service-card, .doke-worker-card, .doke-media-card) {`<br>`:where(.doke-service-card__media, .doke-worker-card__media, .doke-media-card__media) {` |
| `assets/css/pages/home.css` | page | 681 | `body.home-index-shell :is(.featured-services, .more-services) .service-card {`<br>`body.home-index-shell :is(.featured-services, .more-services) .service-card__media {`<br>`body.home-index-shell :is(.featured-services, .more-services) .service-card__body {` |
| `assets/css/pages/detalhe-anuncio.css` | page | 589 | `.location-card h2 {`<br>`.trust-card small {`<br>`.detail-related-card {` |
| `assets/css/pages/home/mobile/sections.css` | page | 556 | `body.home-index-shell .video-card {`<br>`body.home-index-shell .video-card__play {`<br>`body.home-index-shell .video-card__content {` |
| `assets/css/pages/home-sections.css` | page | 480 | `.comparison-card {`<br>`.service-card:focus-within {`<br>`.comparison-card__half::before {` |
| `assets/css/pages/home/layout.css` | page | 470 | `.pro-card {`<br>`.service-card__media {`<br>`.service-card__badge {` |
| `assets/css/components/cards/card-system.css` | component | 397 | `.notification-card {`<br>`.notification-card {`<br>`.notification-card {` |
| `assets/css/pages/home/sections.css` | page | 388 | `.comparison-card {`<br>`.service-card:focus-within {`<br>`.comparison-card__half::before {` |
| `assets/css/components/cards/service-card.css` | component | 382 | `.service-card {`<br>`.service-card:focus-within {`<br>`.service-card__media {` |
| `assets/css/pages/perfil-reference-hero.css` | page | 382 | `body.profile-page-shell .profile-publications-grid .publication-card {`<br>`body.profile-page-shell .profile-publications-grid .publication-card .publication-card__media {`<br>`body.profile-page-shell .profile-publications-grid .publication-card__media--kitchen {` |

### modais

| Arquivo | Tipo | Ocorrências aproximadas | Amostras |
|---|---|---:|---|
| `assets/css/components/overlays/financial-modal-system.css` | component | 493 | `:is(dialog.charge-modal, .wallet-modal:not([hidden])) {`<br>`:is(dialog.charge-modal)::backdrop {`<br>`.wallet-dialog__scrim {` |
| `assets/css/components/overlays/overlay-contract.css` | component | 222 | `:where(.ui-modal, .wallet-modal, .media-lightbox, .before-after-preview, .worker-preview, .home-mobile-drawer) {`<br>`:where(.ui-modal:not([hidden]), .wallet-modal:not([hidden]), .media-lightbox:not([hidden]), .before-after-preview:not([hidden]), .`<br>`:where(.ui-modal__backdrop, .wallet-modal__scrim, .media-lightbox__backdrop, .before-after-preview__backdrop, .worker-preview__bac` |
| `assets/css/components/ui-surface/modal-alignment.css` | component | 202 | `:is(.surface-modal__intro, .detail-budget-modal__intro) {`<br>`:is(dialog.home-address-modal, dialog.address-modal, dialog.profile-budget-modal, dialog.charge-modal) {`<br>`body.home-index-shell .home-address-modal[open] {` |
| `assets/css/pages/carteira.css` | page | 137 | `.wallet-modal__close {`<br>`.wallet-modal[hidden] {`<br>`.wallet-modal {` |
| `assets/css/pages/perfil-budget-modal/quote-flow.css` | page | 123 | `dialog.profile-budget-modal {`<br>`.profile-budget-modal::backdrop {`<br>`.profile-budget-modal .detail-budget-modal__dialog {` |
| `assets/css/components/ui-surface/buttons-close.css` | component | 102 | `:is(.home-address-modal__head, .address-modal__head, .community-request-modal__header, .community-action-modal__header, .charge-mo`<br>`:is(.surface-modal__intro, .detail-budget-modal__intro) {`<br>`:is(.surface-modal__meta, .detail-budget-modal__intro .surface-modal__meta) {` |
| `assets/css/pages/perfil-budget-modal/centering-upload-success.css` | page | 101 | `dialog.profile-budget-modal[open] {`<br>`dialog.profile-budget-modal .detail-budget-modal__dialog {`<br>`.profile-budget-modal [data-budget-page] {` |
| `assets/css/components/ui-surface/overlay-root.css` | component | 88 | `html:has(:is(dialog[open], .wallet-modal:not([hidden]), .ui-modal:not([hidden]), .community-request-modal:not([hidden]), .communit`<br>`:is(.home-address-modal, .address-modal, .profile-followers-modal, .profile-edit-modal, .detail-budget-modal, .profile-budget-moda`<br>`:is(.wallet-modal:not([hidden]), .ui-modal:not([hidden]), .community-request-modal:not([hidden]), .community-action-modal:not([hid` |
| `assets/css/components/ui-surface/responsive.css` | component | 87 | `:is(dialog.address-modal, dialog.home-address-modal, dialog.profile-followers-modal, dialog.profile-edit-modal, dialog.detail-budg`<br>`:is(.wallet-modal__card, .ui-modal__dialog, .home-address-modal__dialog, .address-modal__dialog, .community-request-modal__dialog,`<br>`:is(.surface-modal__intro, .detail-budget-modal__intro) {` |
| `assets/css/pages/perfil-budget-modal/select-layering.css` | page | 84 | `.profile-budget-modal .budget-panel {`<br>`.profile-budget-modal .budget-actions {`<br>`.profile-budget-modal .ui-select {` |

### chat

| Arquivo | Tipo | Ocorrências aproximadas | Amostras |
|---|---|---:|---|
| `assets/css/pages/mensagens/desktop-redesign.css` | mensagens | 2839 | `body.messages-page-shell .messages-shell-content > :not(.messages-app) {`<br>`body.messages-page-shell {`<br>`body.messages-page-shell .messages-shell-content {` |
| `assets/css/components/internal/chat-workspace-contract.css` | component | 1105 | `body.messages-page-shell .page__content {`<br>`body.messages-page-shell .messages-shell-content {`<br>`body.messages-page-shell .messages-app {` |
| `assets/css/pages/mensagens/base-layout.css` | mensagens | 629 | `body.messages-page-shell {`<br>`body.messages-page-shell .topbar.topbar--location.internal-page-topbar {`<br>`body.messages-page-shell .messages-shell-content {` |
| `assets/css/pages/mensagens/mobile-header-drawer.css` | mensagens | 322 | `body.messages-page-shell .messages-mobile-header {`<br>`body.messages-page-shell .messages-search--desktop {`<br>`body.messages-page-shell .messages-desktop-toolbar {` |
| `assets/css/pages/mensagens/community-parity.css` | mensagens | 205 | `body.messages-page-shell {`<br>`body.messages-page-shell .page__content {`<br>`body.messages-page-shell .messages-shell-content {` |
| `assets/css/pages/pedidos/orders-chat.css` | page | 154 | `body.orders-page-shell.orders-chat-open {`<br>`body.orders-page-shell .orders-chat-layer {`<br>`body.orders-page-shell .orders-chat-layer[hidden] {` |
| `assets/css/components/chat-composer.css` | component | 131 | `body.community-room-shell .doke-chat-composer {`<br>`body.community-room-shell .doke-chat-composer__tools {`<br>`body.community-room-shell .doke-chat-composer__send {` |
| `assets/css/pages/mensagens/message-boot.css` | mensagens | 127 | `body.messages-page-shell .messages-sidebar > .messages-sidebar-search:not(.messages-sidebar-search--modern) {`<br>`body.messages-page-shell .messages-shell-content > :not(.messages-app) {`<br>`body.messages-page-shell .messages-shell-content {` |
| `assets/css/components/internal/filter-select-standard.css` | component | 123 | `body.messages-page-shell .messages-header-controls:not([hidden]) {`<br>`body.messages-page-shell .orders-active-filter-row {`<br>`body.messages-page-shell .orders-active-filter-chip {` |
| `assets/css/core/responsive-audit.css` | other | 88 | `:where(.topbar, .internal-page-topbar, .internal-mobile-header, .page-header-context, .orders-page-header, .notifications-page-hea`<br>`:where(.page-header-context__actions, .orders-page-header__actions, .orders-page-header__toolbar, .notifications-page-header__acti`<br>`:where(.service-grid, .services-grid, .results-grid, .results-list, .orders-list, .messages-layout, .notifications-list, .wallet-m` |

## Páginas que parecem recriar componentes existentes

| Página/CSS | Componente já existente provável | Evidência | Recomendação futura |
|---|---|---|---|
| `assets/css/pages/detalhe-anuncio.css` | cards, avaliações, workers, modais | Arquivo enorme, muitos `.card`, `.modal`, `.worker`, `.review` e alto uso de `!important`. | Extrair contratos para `components/cards`, `patterns/reviews` e manter page CSS só para layout local. |
| `assets/css/pages/perfil-reference-hero.css` | hero de perfil, avaliações, cards | Volume crítico e maior concentração de `!important`. | Congelar visual e depois criar componentes de perfil/avaliações reutilizáveis. |
| `assets/css/pages/home.css` e família `assets/css/pages/home/*` | header/search/cards/sections | Múltiplos arquivos de home com chrome, search, sections e versões mobile. | Separar busca/header/cards em componentes e deixar home só com composição. |
| `assets/css/pages/mensagens/desktop-redesign.css` | chat/sidebar/composer | Recria sidebar, thread, composer e mensagens, enquanto existe `assets/css/components/internal/chat-workspace-contract.css`. | Consolidar contrato de chat antes do mobile para evitar duas fontes de verdade. |
| `assets/css/pages/carteira.css` | cards financeiros, modais, botões | Arquivo grande e dependência de modal financeiro compartilhado. | Migrar padrões financeiros para components/patterns sem alterar layout. |
| `assets/css/pages/search-results.css` | service-card e grid de cards | Importa `service-card.css`, mas ainda contém regras longas para `.service-card`. | Manter grid em page/pattern e deixar visual de card no componente canônico. |

## Imports inexistentes ou suspeitos

Após as correções, não há CSS local inexistente carregado diretamente pelos HTMLs principais. Ainda existem `@import`s locais inexistentes em agregadores que não aparecem carregados pelos HTMLs principais auditados; por isso foram registrados, mas não removidos sem prova de uso/runtime.

| Arquivo | Imports inexistentes restantes | Ação |
|---|---|---|
| `assets/css/components/index.css` | `./profile-content-rail.css`, `./profile-services-grid.css`, `./profile-about.css`, `./profile-achievements.css` | Não removido: arquivo agregador não localizado como import direto dos HTMLs principais. Validar uso antes de excluir. |
| `assets/css/pages/home/index.css` | `./base.css`, `./topbar.css`, `./search.css`, `./categories.css`, `./featured.css` | Não removido: arquivo agregador não localizado como import direto dos HTMLs principais. Validar uso antes de excluir. |
| `assets/css/pages/index.css` | `./base.css`, `./topbar.css`, `./search.css`, `./categories.css`, `./featured.css` | Não removido: arquivo agregador não localizado como import direto dos HTMLs principais. Validar uso antes de excluir. |

## Riscos para mobile

1. **Overrides globais com `!important`:** arquivos como `perfil-reference-hero.css`, `desktop-redesign.css`, `detalhe-anuncio.css` e `home.css` podem impedir breakpoints previsíveis.
2. **Componentes recriados em páginas:** cards, modais, sidebar, header e composer aparecem em CSS de página e em CSS de componentes; isso cria duas fontes de verdade.
3. **Chat/mensagens sensível:** `mensagens/desktop-redesign.css` e `components/internal/chat-workspace-contract.css` cobrem áreas semelhantes. Mobile pode herdar regras desktop por especificidade.
4. **Search/card acoplado:** `search-results.css` ainda interfere em `.service-card`, mesmo importando o card canônico.
5. **Home com múltiplas camadas:** família `home`, `home/mobile`, `home-refresh`, `home-search-chrome` aumenta risco de regressão por ordem de import.

## Recomendações de consolidação futura

- Antes do mobile, definir contratos canônicos para: `shell/sidebar/header`, `cards`, `composer/chat`, `modal/sheet`, `profile/reviews`.
- Não remover `!important` em massa. A remoção deve ser por componente, com screenshot antes/depois e testes de largura.
- Migrar visual repetido para `assets/css/components` ou `assets/css/patterns`; deixar `assets/css/pages` apenas com layout específico da página.
- Para mobile, começar pelas páginas com menor risco e só depois atacar `detalhe-anuncio`, `perfil`, `home`, `mensagens` e `carteira`.
- Criar auditoria de ordem de cascade antes de alterar breakpoints, especialmente em home e mensagens.

## Validação pós-correção

| Checagem | Resultado |
|---|---|
| Imports CSS duplicados diretamente nos HTMLs principais | 0 restantes |
| CSS local inexistente carregado diretamente por HTML principal | 0 restantes |
| `@import` duplicado em CSS | 0 restantes |
| Refatoração visual ampla | Não executada |

## Arquivos alterados

- `carteira.html`
- `mensagens.html`
- `assets/css/pages/search-results.css`
- `docs/css-risk-audit-2026-05-20.md`

