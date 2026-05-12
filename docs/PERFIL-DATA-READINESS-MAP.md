# Perfil — Data-readiness Map

Este relatório mapeia o `perfil.html` para futura integração com dados reais, sem alterar visual, HTML ou CSS da página.

## Resumo

- CSS carregados: **45**
- JS carregados: **38**
- `style=""` inline: **1**
- Data-hooks atuais: **107**
- Classes `profile-*`: **80**
- CSS com nomes sensíveis/legados: **2**

## Leitura técnica

O perfil é uma das páginas mais críticas do Doke. Ele combina identidade, owner/visitor/client, abas, serviços, Workers, publicações, avaliações, modais e ações de orçamento/mensagem. Por isso, a integração com dados deve ser feita por camadas e sem redesenho acidental.

## Áreas de dados esperadas

### Identidade do perfil
- Detectado no HTML atual: **sim**
- Dados futuros: `userId`, `displayName`, `avatarUrl`, `headline`, `category`, `location`, `verified`

### Métricas do perfil
- Detectado no HTML atual: **sim**
- Dados futuros: `rating`, `reviewCount`, `followersCount`, `servicesCount`, `completedOrders`

### Abas/áreas do perfil
- Detectado no HTML atual: **sim**
- Dados futuros: `activeTab`, `availableTabs`, `visibilityByRole`

### Serviços/anúncios
- Detectado no HTML atual: **sim**
- Dados futuros: `services[]`, `favoriteState`, `price`, `availability`, `category`

### Workers/vídeos curtos
- Detectado no HTML atual: **sim**
- Dados futuros: `workers[]`, `videoUrl`, `thumbnail`, `likes`, `comments`, `duration`

### Publicações
- Detectado no HTML atual: **sim**
- Dados futuros: `publications[]`, `type`, `media`, `author`, `engagement`

### Avaliações
- Detectado no HTML atual: **sim**
- Dados futuros: `reviews[]`, `scoreBreakdown`, `verifiedClient`, `createdAt`

### Ações owner/visitor/client
- Detectado no HTML atual: **sim**
- Dados futuros: `viewerRole`, `permissions`, `canEdit`, `canMessage`, `canRequestBudget`

### Modais do perfil
- Detectado no HTML atual: **sim**
- Dados futuros: `modalState`, `formDraft`, `validationErrors`, `submitStatus`

## JS atual por responsabilidade

- `assets/js/core/app.js` — core
- `assets/data/mocks/profile-data.js` — other
- `assets/js/pages/search-data.js` — other ⚠️ dependência cruzada a revisar
- `assets/js/features/profile/profile-tabs.js` — feature/profile
- `assets/js/features/profile/profile-share.js` — feature/profile
- `assets/js/pages/home/workers.js` — cross-page-home ⚠️ dependência cruzada a revisar
- `assets/js/pages/home/before-after.js` — cross-page-home ⚠️ dependência cruzada a revisar
- `assets/js/components/doke-lite-select.js` — other
- `assets/js/pages/perfil.js` — page/perfil
- `assets/js/pages/orcamento.js` — other
- `assets/js/pages/perfil-budget.js` — page/perfil
- `assets/js/pages/perfil-budget-success.js` — page/perfil
- `assets/js/ui/responsive-interaction-guard.js` — other
- `assets/js/ui/mobile-drawer-standard.js` — other
- `assets/js/core/runtime-config.js` — core
- `assets/js/core/feature-flags.js` — core
- `assets/js/core/rollout-guard.js` — core
- `assets/js/core/app-state.js` — core
- `assets/js/core/permissions.js` — core
- `assets/js/core/session.js` — core
- `assets/js/services/auth-service.js` — service
- `assets/js/services/mock-data-service.js` — service
- `assets/js/services/profile-service.js` — service
- `assets/js/services/search-service.js` — service
- `assets/js/services/order-service.js` — service
- `assets/js/services/message-service.js` — service
- `assets/js/services/community-service.js` — service
- `assets/js/services/notification-service.js` — service
- `assets/js/services/wallet-service.js` — service
- `assets/js/services/domain-data-service.js` — service
- `assets/js/controllers/controller-data.js` — controller
- `assets/js/core/dom.js` — core
- `assets/js/core/events.js` — core
- `assets/js/core/view-state.js` — core
- `assets/js/core/page-bootstrap.js` — core
- `assets/js/controllers/page-controller-registry.js` — controller
- `assets/js/controllers/perfil-controller.js` — controller
- `assets/js/controllers/controller-bootstrap.js` — controller

## CSS por camada

- Core: **4**
- Components: **28**
- Patterns: **1**
- Pages: **11**
- Outros: **1**
- Suspeitos/legados: **2**

## Recomendações

- Não refatorar visual do perfil antes de congelar baseline por modo: owner, visitor e client.
- Preparar data-hooks por área antes de renderização real via JS/backend.
- Separar controller de página de renderers de cards, workers, publicações e avaliações.
- Evitar transformar regras atuais de mobile/public-profile em contrato global antes da validação visual.
- Reduzir dependência cruzada de scripts de home dentro do perfil apenas depois de mapear Workers/publicações compartilhados.

## Critérios para próxima fase

- Não alterar aparência do perfil sem baseline visual aprovado.
- Adicionar data-hooks somente onde não alteram CSS nem layout.
- Não remover scripts de home usados por Workers/publicações antes de criar componente compartilhado.
- Não consolidar o CSS mobile atual como contrato definitivo sem validação de screenshots.
- Separar renderização de dados do comportamento de UI.
