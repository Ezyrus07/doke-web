# Backend Real E2E Runbook

## Objetivo
Validar localmente o fluxo de ponta a ponta Auth → Identity → Orders → Messaging → Notifications → Wallet usando HTTP real local, sem rede externa.

## Comandos

```bash
npm run audit:backend-real-e2e-local-runtime
npm run validate:backend-real:e2e-local-runtime
npm run validate:backend-real:e2e-local-runtime:report
```

## Cobertura
- Login e sessão.
- `users/me` e `profiles/me`.
- Criação e ações de pedido com idempotência.
- Criação de conversa e mensagem.
- Notificações geradas/lidas.
- Carteira, transações, saque e recibos.

## Critério
Todas as mutações precisam carregar `x-idempotency-key`. Reuso de chave com payload diferente precisa retornar `DOKE_IDEMPOTENCY_CONFLICT`.
