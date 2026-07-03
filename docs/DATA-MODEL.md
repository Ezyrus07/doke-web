# Doke Data Model

Este contrato define o modelo de dados-alvo para migrar o Doke de mock/localStorage para backend real sem alterar páginas, CSS ou componentes visuais.

## Regra central

A UI nunca deve depender do formato cru do armazenamento. Páginas e controllers consomem services/repositories; repositories convertem mock, API ou Supabase para os contratos abaixo.

## Entidades

### User

Representa uma identidade autenticada.

Campos mínimos:

- `id`: identificador estável.
- `role`: `guest`, `client`, `professional`, `support` ou `admin`.
- `name`: nome público.
- `email`: e-mail de login, privado.
- `avatarUrl`: imagem pública opcional.
- `createdAt`, `updatedAt`.

Relacionamentos:

- possui um perfil de cliente por padrão;
- pode possuir um `Professional`;
- pode receber `Notification`;
- pode ser ator de `AuditEvent`.

### Professional

Representa o perfil operacional de prestador.

Campos mínimos:

- `id`.
- `userId`.
- `displayName`.
- `categories`.
- `rating`.
- `status`: `draft`, `pending_review`, `active`, `paused`, `blocked`.
- `bankAccountId`, quando configurado.
- `createdAt`, `updatedAt`.

Relacionamentos:

- pertence a um `User`;
- recebe `Order`;
- possui `Receivable` e `Withdrawal`.

### Order

Representa a solicitação de serviço e seu ciclo operacional.

Campos mínimos:

- `id`.
- `clientId`.
- `professionalId`.
- `conversationId`.
- `serviceId`.
- `title`.
- `status`.
- `detailFlow`.
- `amount`.
- `walletTransactionId`.
- `receiptUrl`.
- `createdAt`, `updatedAt`.

Status oficiais:

- `requested`: orçamento solicitado.
- `accepted`: profissional aceitou.
- `charged`: cobrança enviada.
- `paid`: pagamento confirmado e em garantia.
- `in_progress`: serviço em execução.
- `completed`: serviço concluído pelo profissional.
- `disputed`: contestação aberta.
- `under_review`: contestação em análise.
- `released`: repasse liberado ao profissional.
- `refunded`: cliente reembolsado.
- `cancelled`: pedido cancelado antes de pagamento final.

Aliases frontend enquanto a migração é gradual:

- `pending`: equivalente visual de `requested`.
- `quoted`: equivalente visual de `charged`/proposta enviada.
- `conversation`: variação visual de `accepted`.
- `disputed`: também cobre `under_review` quando a tela ainda não separa análise.

Esses aliases devem ser convertidos no repository/service, nunca no renderer.

### Conversation

Representa o canal ligado ao pedido.

Campos mínimos:

- `id`.
- `orderId`.
- `participants`: ids de cliente, profissional e suporte quando aplicável.
- `status`: `open`, `restricted`, `closed`.
- `lastMessageAt`.
- `createdAt`, `updatedAt`.

### Message

Representa mensagem, evento operacional ou card financeiro dentro da conversa.

Campos mínimos:

- `id`.
- `conversationId`.
- `orderId`.
- `senderId`.
- `type`: `text`, `system`, `charge`, `payment`, `dispute`, `receipt`, `support_event`.
- `body`.
- `attachments`.
- `metadata`.
- `createdAt`.

### Payment

Representa a intenção/execução de pagamento do cliente.

Campos mínimos:

- `id`.
- `orderId`.
- `clientId`.
- `professionalId`.
- `amountGross`.
- `platformFee`.
- `amountNet`.
- `status`.
- `method`.
- `walletTransactionId`.
- `receiptId`.
- `createdAt`, `paidAt`, `updatedAt`.

Status oficiais:

- `created`.
- `authorized`.
- `paid`.
- `held`.
- `released`.
- `refunded`.
- `failed`.
- `cancelled`.

### WalletTransaction

Representa qualquer movimentação financeira exibida em carteira/extrato.

Campos mínimos:

- `id`.
- `ownerId`.
- `orderId`.
- `paymentId`.
- `withdrawalId`.
- `type`: `payment`, `release`, `refund`, `withdrawal`, `fee`, `adjustment`.
- `direction`: `in`, `out` ou `neutral`.
- `amountGross`.
- `feeAmount`.
- `amountNet`.
- `status`.
- `releaseStatus`.
- `receiptUrl`.
- `createdAt`, `availableAt`, `updatedAt`.

Status oficiais:

- `pending`.
- `held`.
- `available`.
- `processing`.
- `completed`.
- `declined`.
- `refunded`.
- `blocked`.

### Receivable

Representa o valor futuro derivado de um pagamento em garantia.

Campos mínimos:

- `id`.
- `transactionId`.
- `professionalId`.
- `orderId`.
- `amountNet`.
- `status`: `scheduled`, `held`, `blocked`, `available`, `released`, `refunded`, `cancelled`.
- `scheduledFor`.
- `releasedAt`.

### Withdrawal

Representa solicitação de saque do profissional.

Campos mínimos:

- `id`.
- `professionalId`.
- `walletTransactionId`.
- `amount`.
- `bankAccountId`.
- `status`: `requested`, `processing`, `completed`, `declined`, `cancelled`.
- `reason`.
- `receiptId`.
- `createdAt`, `resolvedAt`, `updatedAt`.

### Dispute

Representa contestação aberta pelo cliente.

Campos mínimos:

- `id`.
- `orderId`.
- `transactionId`.
- `clientId`.
- `professionalId`.
- `reason`.
- `description`.
- `status`.
- `professionalResponse`.
- `resolution`.
- `resolvedBy`.
- `createdAt`, `respondedAt`, `resolvedAt`, `updatedAt`.

Status oficiais:

- `contestacao_aberta`.
- `em_analise`.
- `resolvida_profissional`.
- `resolvida_cliente`.
- `reembolsado`.

### Notification

Representa alerta persistente do usuário.

Campos mínimos:

- `id`.
- `userId`.
- `type`.
- `category`.
- `title`.
- `body`.
- `targetUrl`.
- `actionLabel`.
- `eventKey`.
- `orderId`.
- `conversationId`.
- `messageId`.
- `read`.
- `dismissed`.
- `readAt`.
- `createdAt`.
- `updatedAt`.

Status oficiais:

- `unread`.
- `read`.
- `dismissed`.

Regra: `eventKey` deve ser idempotente para impedir duplicação em reprocessamento. `targetUrl` e `actionLabel` são parte do contrato de navegação e não devem ser inferidos pelo renderer.

### Receipt

Representa comprovante mockado hoje e comprovante financeiro no backend futuro.

Campos mínimos:

- `id`.
- `transactionId`.
- `orderId`.
- `type`: `payment`, `release`, `refund`, `withdrawal`.
- `code`.
- `amountGross`.
- `feeAmount`.
- `amountNet`.
- `status`.
- `issuedAt`.
- `url`.

### AuditEvent

Representa registro administrativo imutável.

Campos mínimos:

- `id`.
- `actorId`.
- `actorRole`.
- `action`.
- `entityType`.
- `entityId`.
- `orderId`.
- `transactionId`.
- `reason`.
- `metadata`.
- `createdAt`.

## Permissões mínimas

| Ação | Cliente | Profissional | Suporte | Admin |
|---|---:|---:|---:|---:|
| Criar pedido | sim | não | não | sim |
| Aceitar pedido | não | sim | não | sim |
| Pagar pedido | sim | não | não | sim |
| Abrir contestação | sim | não | sim | sim |
| Responder contestação | não | sim | não | sim |
| Liberar repasse | não | não | sim | sim |
| Reembolsar cliente | não | não | sim | sim |
| Solicitar saque | não | sim | não | sim |
| Aprovar/recusar saque | não | não | sim | sim |
| Ver auditoria | não | não | sim | sim |

## Migração segura

1. Manter os ids mockados estáveis durante a transição.
2. Criar adapters por entidade antes de trocar repository.
3. Converter status no repository, nunca no renderer.
4. Garantir idempotência em notificações, recibos e auditoria.
5. Validar permissões no backend mesmo quando a UI já esconde a ação.


## Sprint 12D — Messages API provider contract

- `messages` remains mock/localStorage by default and only uses API when `repositoryBoundary` reports active provider `api` with `apiBaseUrl` and `enableNetworkRequests`.
- Conversations use `GET /conversations`, `GET /conversations/:id`, `POST /orders/:id/conversation`, `POST /conversations/:id/order`, `POST /conversations/:id/messages`, and `POST /conversations/:id/read`.
- Pages must call `Doke.services.messages`; renderers must not call `fetch()` or backend endpoints directly.
- System events, charge cards, payment events and dispute events remain messages with typed payloads so the chat history can be migrated without changing UI renderers.

## Sprint 12F wallet API notes

Wallet-related DTOs must support both mock and API payloads with stable frontend fields:

- `WalletSummary`: `availableBalance`, `pendingBalance`, `monthlyIncome`, `withdrawals`, `fees`, `monthlyDashboard`, `receivablesSchedule`, `bankAccount`.
- `WalletTransaction`: `id`, `type`, `status`, `grossAmount`, `netAmount`, `feeAmount`, `orderId`, `conversationId`, `receiptUrl`, `releaseStatus`.
- `ReceivableSchedule`: `next`, `items`, `scheduledNet`, `releasedNet`, `pendingCount`, `releasedCount`.
- `Withdrawal`: represented as `WalletTransaction` with `type=withdraw` and status `processing`, `completed` or `declined`.
- `AuditEvent`: `id`, `type`, `action`, `actorId`, `actorRole`, `transactionId`, `disputeId`, `createdAt`.
