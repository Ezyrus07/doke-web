# Doke UI Surface System — 2026-04-26

## Objetivo
Consolidar em uma única camada visual todos os elementos que abrem, aparecem sobre a interface ou funcionam como superfícies internas: modais, dialogs, popovers, dropdowns, drawers, sidepanels, lightboxes, filtros expansíveis, seletores customizados, cards internos, botões de fechar, ações e campos de formulário.

## Fonte de verdade
- `assets/css/components/ui-surface-system.css`
- `assets/css/components/surface-contract-final.css` permanece apenas como ponte de compatibilidade e importa o novo sistema.

## HTMLs conectados diretamente à camada final
- `index.html`
- `resultados.html`
- `perfil.html`
- `detalhe-anuncio.html`
- `pedidos.html`
- `mensagens.html`
- `comunidade.html`
- `comunidade-interna.html`
- `notificacoes.html`
- `carteira.html`
- `configuracoes.html`
- `pagamento.html`
- `finalizar-pedido.html`
- `avaliacao.html`
- `adicionar-cartao.html`

## Componentes mapeados

### Modais e dialogs
- `.wallet-modal`, `.wallet-modal__card`, `.wallet-modal__close`
- `.ui-modal`, `.ui-modal__dialog`
- `.home-address-modal`, `.home-address-modal__dialog`
- `.address-modal`, `.address-modal__dialog`
- `.community-request-modal`, `.community-request-modal__dialog`
- `.community-action-modal`, `.community-action-modal__dialog`
- `.payment-overlay`, `.payment-overlay__dialog`
- `.detail-modal`, `.detail-modal__card`
- `.profile-followers-modal`, `.profile-edit-modal`
- `.detail-budget-modal`, `.detail-budget-modal__dialog`
- `.charge-modal`, `.charge-modal__surface`
- `.image-lightbox`, `.image-lightbox__surface`

### Lightboxes e previews de mídia
- `.doke-media-lightbox`, `.doke-media-lightbox__surface`
- `.detail-lightbox`
- `.before-after-preview`, `.before-after-preview__dialog`
- `.worker-preview`, `.worker-preview__dialog`

### Drawers, sidepanels e filtros
- `.home-mobile-drawer`, `.home-mobile-drawer__panel`
- `.orders-sidepanel`
- `.results-filters`
- `.orders-filters-popover`, `.orders-select-panel`
- `.notifications-filters-panel`, `.notifications-select-panel`
- `.messages-filters-panel`
- `.more-filters`

### Popovers, dropdowns e seletores
- `.home-location-popover`
- `.search-dropdown`
- `.community-select__menu`
- `.profile-dropdown`

### Cards internos padronizados
- `.wallet-summary-card`, `.wallet-panel`, `.wallet-bank-card`, `.wallet-payment-card`, `.wallet-transaction`
- `.order-card`, `.notification-card`, `.community-post-card`, `.community-member-panel`
- `.messages-block`, `.message-item`, `.messages-thread`, `.messages-empty__card`
- `.settings-card`, `.settings-toggle-card`, `.settings-panel`
- `.profile-panel`, `.profile-info-card`, `.profile-review-card`, `.profile-content-card`
- `.detail-budget-card`, `.detail-info-card`, `.detail-provider-card`
- `.orders-detail-summary`, `.orders-sidepanel__section`
- `.community-action-modal__preview`, `.community-action-cover > div`

## Contrato aplicado

### Backdrop
Todos os scrims/backdrops usam `--doke-overlay-bg` e `--doke-overlay-blur`.

### Superfície principal
Todas as superfícies principais usam os mesmos tokens:
- `--doke-surface-bg`
- `--doke-surface-border`
- `--doke-surface-radius-lg`
- `--doke-surface-shadow`
- `--doke-surface-padding`

### Botão de fechar
Todos os botões de fechar usam o mesmo contrato:
- desktop: `52px x 52px`
- mobile: `44px x 44px`
- `border-radius: 999px`
- fundo `--doke-secondary-action-bg`
- cor `--doke-secondary-action-color`
- ícone proporcional via `--doke-close-button-icon-size`

### Campos
Inputs, selects, textareas e triggers customizados usam:
- altura mínima `--doke-control-height`
- raio `--doke-control-radius`
- padding horizontal padronizado
- background `--doke-surface-muted`

### Ações
Botões primários e secundários foram centralizados por intenção:
- primário: `--doke-primary-action-bg` / `--doke-primary-action-color`
- secundário: `--doke-secondary-action-bg` / `--doke-secondary-action-color`

### Mobile
- superfícies principais: `width: calc(100vw - 28px)`
- altura máxima: `calc(100dvh - 28px)`
- ações empilhadas em uma coluna
- scroll interno com `overscroll-behavior: contain`
- nenhuma superfície deve depender de largura fixa local.

## Decisão sobre CSS antigo
Regras locais antigas não foram apagadas em massa para evitar regressão visual em desktop. A neutralização acontece em uma única camada final, carregada por último, com seletores explícitos dos componentes reais do projeto. Esse é o ponto correto de compatibilidade até uma próxima fase de limpeza removendo blocos mortos página por página.

## Validação executada
- Conferência estática dos HTMLs obrigatórios para garantir que a camada final é carregada depois dos CSS específicos de página.
- Conferência dos tokens mínimos exigidos no novo arquivo.
- Tentativa de validação via Chromium headless local; o binário do ambiente travou e não retornou screenshots/DOM auditável de forma confiável. A camada foi deixada pronta para validação local com Live Server/Playwright.

## Próximo passo seguro
Rodar localmente o teste visual nas larguras 375px, 390px e 430px e remover blocos legados já neutralizados quando não houver regressão.
