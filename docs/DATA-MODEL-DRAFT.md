# Rascunho de modelo de dados — Doke

Este documento define entidades de domínio suficientes para orientar nomes de estados, mocks, renderizadores e futura integração com backend. Não é schema final de banco.

## Entidades principais

### User

- `id`
- `firstName`
- `fullName`
- `avatarUrl`
- `role`: `client | professional | admin`
- `createdAt`

### ProfessionalProfile

- `id`
- `userId`
- `displayName`
- `categories`
- `rating`
- `reviewsCount`
- `location`
- `isVerified`
- `portfolioItems`
- `services`

### ServiceAd

- `id`
- `professionalId`
- `title`
- `description`
- `priceLabel`
- `category`
- `mediaUrl`
- `status`: `draft | published | paused | archived`

### Order

- `id`
- `clientId`
- `professionalId`
- `serviceAdId`
- `title`
- `status`: `requested | accepted | in_progress | delivered | completed | canceled | disputed`
- `createdAt`
- `updatedAt`

### MessageThread

- `id`
- `orderId`
- `participants`
- `lastMessageAt`
- `unreadCount`

### Notification

- `id`
- `userId`
- `type`
- `title`
- `body`
- `isRead`
- `createdAt`

## Estados de UI ligados ao domínio

Use `data-state` ou classes equivalentes para:

- `loading`
- `empty`
- `ready`
- `error`
- `selected`
- `expanded`
- `owner`
- `visitor`
