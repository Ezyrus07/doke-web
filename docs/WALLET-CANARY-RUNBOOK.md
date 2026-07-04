# Wallet Canary Runbook — Sprint 42

## Objetivo

Preparar carteira/financeiro real do Doke sem ativar produção. Este domínio é crítico porque envolve saldo, saque, disputa, recibo e ações admin.

## Escopo coberto

Endpoints validados no harness local:

- `GET /wallet`
- `GET /wallet/transactions`
- `GET /wallet/dashboard`
- `GET /wallet/monthly-history`
- `GET /wallet/receivables/schedule`
- `GET /wallet/bank-account`
- `GET /wallet/receivables`
- `POST /wallet/bank-account`
- `POST /wallet/receivables`
- `GET /withdrawals`
- `POST /withdrawals`
- `POST /withdrawals/:id/approve`
- `POST /withdrawals/:id/decline`
- `GET /disputes`
- `POST /disputes`
- `POST /disputes/:id/respond`
- `POST /admin/disputes/:id/release`
- `POST /admin/disputes/:id/refund`
- `GET /receipts`
- `GET /receipts/:id`

## Regras permanentes

- `mock` permanece padrão.
- Toda mutação exige `x-idempotency-key`.
- Ações de aprovação, release e refund são admin-only.
- Nenhum saldo real pode ser alterado fora de `local` ou `staging` com flags explícitas.

## Comandos

```bash
npm run audit:backend-domain-canary-runtime
npm run validate:wallet-canary:local-runtime
npm run validate:wallet-canary:local-runtime:report
```

## Promoção para staging

Carteira só pode passar para staging real depois de Auth, Orders e domínio local passarem:

```bash
npm run validate:backend-real:staging-preflight-gate
```
