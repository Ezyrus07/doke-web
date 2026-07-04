# Notifications Canary Runbook — Sprint 41

## Objetivo

Preparar notificações reais controladas do Doke com contrato local, idempotência e isolamento, sem ativar API global e sem alterar visual.

## Escopo coberto

Endpoints validados no harness local:

- `GET /notifications`
- `GET /notifications/:id`
- `POST /notifications`
- `PATCH /notifications/:id` permanece fora do canary local mutável inicial
- `POST /notifications/:id/read`
- `POST /notifications/:id/dismiss`
- `POST /notifications/read-all`

## Regras permanentes

- `mock` permanece padrão.
- Criação sintética de notificação é restrita a admin no harness.
- Leitura, dismiss e read-all exigem `x-idempotency-key`.
- O canary não pode vazar para messages, wallet, orders write ou produção.

## Comandos

```bash
npm run audit:backend-domain-canary-runtime
npm run validate:notifications-canary:local-runtime
npm run validate:notifications-canary:local-runtime:report
```

## Promoção para staging

A promoção é bloqueada até existirem relatórios reais anteriores e alvo staging/local seguro:

```bash
npm run validate:backend-real:staging-preflight-gate:check-env
npm run validate:backend-real:staging-preflight-gate
```
