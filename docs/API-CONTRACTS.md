# Contratos de API — rascunho

## Auth
- POST /auth/login
- POST /auth/logout
- POST /auth/register
- POST /auth/recover

## Services
- GET /services
- GET /services/:id
- POST /services
- PATCH /services/:id

## Orders
- GET /orders
- POST /orders
- GET /orders/:id
- POST /orders/:id/budgets
- PATCH /orders/:id/status

## Messaging
- GET /conversations
- GET /conversations/:id/messages
- POST /conversations/:id/messages

## Payments
- POST /checkout
- GET /wallet
- POST /payouts

Observação: isto é contrato-alvo. A implementação real pode começar com Supabase client e evoluir para API/Edge Functions.
