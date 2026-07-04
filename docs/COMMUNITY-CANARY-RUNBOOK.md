# Community / Comunidade Canary Runbook

## Objetivo
Preparar comunidade para backend real antes de conectar a UI a API.

## Contrato
- `GET /community/posts`
- `POST /community/posts`
- `POST /community/posts/:id/comments`
- `POST /community/posts/:id/reactions`

## Regras
- Usuário autenticado pode criar post, comentar e reagir no harness local.
- Toda mutação exige `x-idempotency-key`.
- Reações repetidas devem ser estáveis e idempotentes.
- Não acoplar comunidade a mensagens, carteira, pedidos ou admin.

## Validação local
```bash
npm run validate:community-canary:local-runtime
```
